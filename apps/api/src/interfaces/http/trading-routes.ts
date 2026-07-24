import {
  BatchOrderResponse,
  CancelBatchOrderBody,
  EntityId,
  PlaceBatchOrderBody,
} from "@axiom/contracts";
import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { CancelBatchOrders } from "../../application/trading/cancel-batch-orders.js";
import { PlaceBatchOrder } from "../../application/trading/place-batch-order.js";
import { SyncBatchOrders } from "../../application/trading/sync-batch-orders.js";
import { requestContext } from "./auth-plugin.js";
import { orderBatchDto } from "./presenters.js";

export function tradingRoutes(
  placeBatchOrder: PlaceBatchOrder,
  syncBatchOrders: SyncBatchOrders,
  cancelBatchOrders: CancelBatchOrders,
): FastifyPluginAsyncTypebox {
  return async (app) => {
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
