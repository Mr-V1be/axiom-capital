import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";
import { Type } from "@sinclair/typebox";
import { AppConfig } from "../infrastructure/config/app-config.js";
import { accountRoutes } from "../interfaces/http/account-routes.js";
import { authPlugin } from "../interfaces/http/auth-plugin.js";
import { errorHandler } from "../interfaces/http/error-handler.js";
import { portfolioRoutes } from "../interfaces/http/portfolio-routes.js";
import { settlementRoutes } from "../interfaces/http/settlement-routes.js";
import { tradingRoutes } from "../interfaces/http/trading-routes.js";
import { AppContainer } from "./container.js";

export async function buildApp(config: AppConfig, container: AppContainer) {
  const app = Fastify({
    logger: {
      level: config.environment === "development" ? "debug" : "info",
      redact: {
        paths: [
          "req.headers.authorization",
          "req.body.apiKey",
          "req.body.secret",
        ],
        censor: "[REDACTED]",
      },
    },
    requestIdHeader: "x-request-id",
    trustProxy: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  await app.register(helmet);
  await app.register(cors, {
    origin: config.webOrigin,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  app.setErrorHandler(errorHandler);

  app.get(
    "/health",
    {
      schema: {
        response: {
          200: Type.Object({
            status: Type.Literal("ok"),
            timestamp: Type.String({ format: "date-time" }),
          }),
        },
      },
    },
    async () => ({ status: "ok" as const, timestamp: new Date().toISOString() }),
  );

  await app.register(
    async (protectedApp) => {
      await authPlugin(config.auth)(protectedApp, {});
      await protectedApp.register(accountRoutes(container.useCases));
      await protectedApp.register(
        portfolioRoutes(container.useCases.getPortfolioOverview),
      );
      await protectedApp.register(
        tradingRoutes(
          container.useCases.placeBatchOrder,
          container.useCases.syncBatchOrders,
          container.useCases.cancelBatchOrders,
          container.useCases.getMarketQuote,
        ),
      );
      await protectedApp.register(
        settlementRoutes(
          container.useCases.createSettlement,
          container.useCases.listSettlements,
          container.useCases.getSplitOverview,
          container.useCases.provisionTestSplit,
        ),
      );
    },
    { prefix: "/v1" },
  );

  app.addHook("onClose", async () => {
    await container.db.$disconnect();
  });
  return app;
}
