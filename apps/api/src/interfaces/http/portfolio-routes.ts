import { PortfolioOverview } from "@axiom/contracts";
import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { GetPortfolioOverview } from "../../application/portfolio/get-overview.js";
import { requestContext } from "./auth-plugin.js";

export function portfolioRoutes(
  getOverview: GetPortfolioOverview,
): FastifyPluginAsyncTypebox {
  return async (app) => {
    app.get(
      "/portfolio/overview",
      { schema: { response: { 200: PortfolioOverview } } },
      async (request) => {
        const result = await getOverview.execute(requestContext(request));
        return {
          totalEquity: {
            amount: result.totalEquity.toString(),
            currency: result.totalEquity.currency,
          },
          pnlToday: {
            amount: result.pnlToday.toString(),
            currency: result.pnlToday.currency,
          },
          pnlMonth: {
            amount: result.pnlMonth.toString(),
            currency: result.pnlMonth.currency,
          },
          activeAccounts: result.activeAccounts,
          connectedAccounts: result.connectedAccounts,
          maxDrawdownPercent: result.maxDrawdownPercent,
          equityCurve: result.equityCurve.map((point) => ({
            at: point.at.toISOString(),
            value: point.value.toString(),
          })),
          updatedAt: result.updatedAt.toISOString(),
        };
      },
    );
  };
}
