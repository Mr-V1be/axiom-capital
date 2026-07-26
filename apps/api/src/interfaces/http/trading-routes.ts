import {
  BatchOrderResponse,
  CancelExchangeOrderBody,
  CancelExchangeOrderParams,
  CancelBatchOrderBody,
  EntityId,
  ExchangeActivityResponse,
  ExchangeCommandResponse,
  MarketQuoteQuery,
  MarketQuoteResponse,
  PlaceBatchOrderBody,
  PositionListResponse,
  PositionActionBody,
  PositionActionParams,
  PositionActionResponse,
} from "@axiom/contracts";
import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { CancelBatchOrders } from "../../application/trading/cancel-batch-orders.js";
import { PlaceBatchOrder } from "../../application/trading/place-batch-order.js";
import { SyncBatchOrders } from "../../application/trading/sync-batch-orders.js";
import { GetMarketQuote } from "../../application/market/get-market-quote.js";
import { ListOpenPositions } from "../../application/positions/list-open-positions.js";
import { ListExchangeActivity } from "../../application/positions/list-exchange-activity.js";
import { ManagePosition } from "../../application/positions/manage-position.js";
import { CancelExchangeOrder } from "../../application/positions/cancel-exchange-order.js";
import { requestContext } from "./auth-plugin.js";
import { orderBatchDto } from "./presenters.js";

export function tradingRoutes(
  placeBatchOrder: PlaceBatchOrder,
  syncBatchOrders: SyncBatchOrders,
  cancelBatchOrders: CancelBatchOrders,
  getMarketQuote: GetMarketQuote,
  listOpenPositions: ListOpenPositions,
  listExchangeActivity: ListExchangeActivity,
  managePosition: ManagePosition,
  cancelExchangeOrder: CancelExchangeOrder,
): FastifyPluginAsyncTypebox {
  return async (app) => {
    app.get(
      "/positions",
      { schema: { response: { 200: PositionListResponse } } },
      async (request) => {
        const result = await listOpenPositions.execute(requestContext(request));
        return {
          ...result,
          items: result.items.map((position) => ({
            ...position,
            openedAt: position.openedAt?.toISOString() ?? null,
            updatedAt: position.updatedAt.toISOString(),
          })),
          updatedAt: result.updatedAt.toISOString(),
        };
      },
    );

    app.get(
      "/exchange/activity",
      { schema: { response: { 200: ExchangeActivityResponse } } },
      async (request) => {
        const result = await listExchangeActivity.execute(
          requestContext(request),
        );
        const order = (item: typeof result.openOrders[number]) => ({
          ...item,
          createdAt: item.createdAt?.toISOString() ?? null,
          updatedAt: item.updatedAt?.toISOString() ?? null,
        });
        return {
          openOrders: result.openOrders.map(order),
          recentOrders: result.recentOrders.map(order),
          recentTrades: result.recentTrades.map((item) => ({
            ...item,
            createdAt: item.createdAt?.toISOString() ?? null,
          })),
          failures: result.failures,
          updatedAt: result.updatedAt.toISOString(),
        };
      },
    );

    app.post(
      "/positions/:accountId/:positionId/actions",
      {
        schema: {
          params: PositionActionParams,
          body: PositionActionBody,
          response: { 200: PositionActionResponse },
        },
      },
      async (request) => managePosition.execute(
        requestContext(request),
        request.params.accountId,
        request.params.positionId,
        request.body,
      ),
    );

    app.post(
      "/exchange/orders/:orderId/cancel",
      {
        schema: {
          params: CancelExchangeOrderParams,
          body: CancelExchangeOrderBody,
          response: { 200: ExchangeCommandResponse },
        },
      },
      async (request) => cancelExchangeOrder.execute(
        requestContext(request),
        request.params.orderId,
        request.body,
      ),
    );

    app.get(
      "/markets/quote",
      {
        schema: {
          querystring: MarketQuoteQuery,
          response: { 200: MarketQuoteResponse },
        },
      },
      async (request) => {
        const quote = await getMarketQuote.execute(
          request.query.symbol,
          request.query.marketType,
        );
        return {
          ...quote,
          updatedAt: quote.updatedAt.toISOString(),
        };
      },
    );

    app.post(
      "/orders/batch",
      {
        schema: {
          body: PlaceBatchOrderBody,
          response: { 202: BatchOrderResponse },
        },
      },
      async (request, reply) => {
        const batch = await placeBatchOrder.execute(
          requestContext(request),
          request.body,
        );
        return reply.status(202).send(orderBatchDto(batch));
      },
    );

    app.post(
      "/orders/:batchId/sync",
      {
        schema: {
          params: Type.Object({ batchId: EntityId }),
          response: { 200: BatchOrderResponse },
        },
      },
      async (request) => orderBatchDto(
        await syncBatchOrders.execute(
          requestContext(request),
          request.params.batchId,
        ),
      ),
    );

    app.post(
      "/orders/:batchId/cancel",
      {
        schema: {
          params: Type.Object({ batchId: EntityId }),
          body: CancelBatchOrderBody,
          response: { 200: BatchOrderResponse },
        },
      },
      async (request) => orderBatchDto(
        await cancelBatchOrders.execute(
          requestContext(request),
          request.params.batchId,
          request.body,
        ),
      ),
    );
  };
}
