import {
  BatchOrderResponse,
  PlaceBatchOrderBody,
} from "@axiom/contracts";
import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { PlaceBatchOrder } from "../../application/trading/place-batch-order.js";
import { requestContext } from "./auth-plugin.js";
import { orderBatchDto } from "./presenters.js";

export function tradingRoutes(
  placeBatchOrder: PlaceBatchOrder,
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
  };
}
