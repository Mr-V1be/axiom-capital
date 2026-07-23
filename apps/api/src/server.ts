import "dotenv/config";
import { buildApp } from "./app/build-app.js";
import { createContainer } from "./app/container.js";
import { loadConfig } from "./infrastructure/config/app-config.js";

const config = loadConfig();
const container = createContainer(config);
const app = await buildApp(config, container);

const shutdown = async (signal: NodeJS.Signals) => {
  app.log.info({ signal }, "Graceful shutdown started");
  await app.close();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.fatal(error);
  await app.close();
  process.exit(1);
}
