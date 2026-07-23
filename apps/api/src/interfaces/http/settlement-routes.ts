import {
  CreateSettlementBody,
  PageQuery,
  Settlement,
  SettlementListResponse,
} from "@axiom/contracts";
import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { CreateSettlement } from "../../application/settlements/create-settlement.js";
import { ListSettlements } from "../../application/settlements/list-settlements.js";
import { requestContext } from "./auth-plugin.js";
import { settlementDto } from "./presenters.js";

export function settlementRoutes(
  createSettlement: CreateSettlement,
  listSettlements: ListSettlements,
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
  };
}
