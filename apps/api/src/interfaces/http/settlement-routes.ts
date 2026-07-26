import {
  CreateSettlementBody,
  PageQuery,
  ProvisionTestSplitBody,
  Settlement,
  SettlementListResponse,
  SplitConfiguration,
  SplitOverview,
} from "@axiom/contracts";
import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { CreateSettlement } from "../../application/settlements/create-settlement.js";
import { GetSplitOverview } from "../../application/settlements/get-split-overview.js";
import { ListSettlements } from "../../application/settlements/list-settlements.js";
import { ProvisionTestSplit } from "../../application/settlements/provision-test-split.js";
import { requestContext } from "./auth-plugin.js";
import { settlementDto, splitConfigurationDto } from "./presenters.js";

export function settlementRoutes(
  createSettlement: CreateSettlement,
  listSettlements: ListSettlements,
  getSplitOverview: GetSplitOverview,
  provisionTestSplit: ProvisionTestSplit,
): FastifyPluginAsyncTypebox {
  return async (app) => {
    app.get(
      "/settlements",
      {
        schema: {
          querystring: PageQuery,
          response: { 200: SettlementListResponse },
        },
      },
      async (request) => {
        const result = await listSettlements.execute(requestContext(request), {
          limit: request.query.limit ?? 25,
          ...(request.query.cursor ? { cursor: request.query.cursor } : {}),
        });
        return {
          items: result.items.map((item) => settlementDto(item.snapshot())),
          ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
        };
      },
    );

    app.post(
      "/settlements",
      {
        schema: {
          body: CreateSettlementBody,
          response: { 201: Settlement },
        },
      },
      async (request, reply) => {
        const state = await createSettlement.execute(
          requestContext(request),
          request.body,
        );
        return reply.status(201).send(settlementDto(state));
      },
    );

    app.get(
      "/splits",
      { schema: { response: { 200: SplitOverview } } },
      async (request) => {
        const overview = await getSplitOverview.execute(requestContext(request));
        return {
          network: overview.network,
          items: overview.items.map(splitConfigurationDto),
        };
      },
    );

    app.post(
      "/accounts/:accountId/split/testnet",
      {
        schema: {
          params: Type.Object({
            accountId: Type.String({ minLength: 20, maxLength: 64 }),
          }),
          body: ProvisionTestSplitBody,
          response: { 201: SplitConfiguration },
        },
      },
      async (request, reply) => {
        const configuration = await provisionTestSplit.execute(
          requestContext(request),
          {
            accountId: request.params.accountId,
            traderSharePercent: request.body.traderSharePercent,
          },
        );
        return reply.status(201).send(splitConfigurationDto(configuration));
      },
    );
  };
}
