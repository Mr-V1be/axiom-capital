import {
  RiskProfileResponse,
  UpdateRiskProfileBody,
} from "@axiom/contracts";
import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { GetRiskProfile } from "../../../application/risk/get-risk-profile.js";
import { UpdateRiskProfile } from "../../../application/risk/update-risk-profile.js";
import { requestContext } from "../auth-plugin.js";
import { riskProfileDto } from "../presenters.js";

const Params = Type.Object({ accountId: Type.String({ minLength: 1 }) });

export function riskRoutes(
  getRiskProfile: GetRiskProfile,
  updateRiskProfile: UpdateRiskProfile,
): FastifyPluginAsyncTypebox {
  return async (app) => {
    app.get(
      "/accounts/:accountId/risk",
      {
        schema: {
          params: Params,
          response: { 200: RiskProfileResponse },
        },
      },
      async (request) => riskProfileDto(
        await getRiskProfile.execute(
          requestContext(request),
          request.params.accountId,
        ),
      ),
    );
    app.patch(
      "/accounts/:accountId/risk",
      {
        schema: {
          params: Params,
          body: UpdateRiskProfileBody,
          response: { 200: RiskProfileResponse },
        },
      },
      async (request) => riskProfileDto(
        await updateRiskProfile.execute(
          requestContext(request),
          request.params.accountId,
          request.body,
        ),
      ),
    );
  };
}
