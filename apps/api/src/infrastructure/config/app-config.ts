export interface AppConfig {
  environment: "development" | "test" | "production";
  host: string;
  port: number;
  webOrigin: string;
  databaseUrl: string;
  auth:
    | { mode: "jwt"; jwtSecret: string }
    | {
        mode: "basic";
        username: string;
        password: string;
        tenantId: string;
        actorId: string;
      };
  encryptionKey: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export function loadConfig(): AppConfig {
  const environment = process.env.NODE_ENV ?? "development";
  if (!["development", "test", "production"].includes(environment)) {
    throw new Error(`Unsupported NODE_ENV: ${environment}`);
  }
  const port = Number(process.env.API_PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("API_PORT must be a valid TCP port");
  }

  const authMode = process.env.AUTH_MODE ?? "jwt";
  if (!["jwt", "basic"].includes(authMode)) {
    throw new Error(`Unsupported AUTH_MODE: ${authMode}`);
  }

  return {
    environment: environment as AppConfig["environment"],
    host: process.env.API_HOST ?? "0.0.0.0",
    port,
    webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
    databaseUrl: required("DATABASE_URL"),
    auth: authMode === "basic"
      ? {
          mode: "basic",
          username: required("BASIC_AUTH_USERNAME"),
          password: required("BASIC_AUTH_PASSWORD"),
          tenantId: required("BASIC_AUTH_TENANT_ID"),
          actorId: required("BASIC_AUTH_ACTOR_ID"),
        }
      : { mode: "jwt", jwtSecret: required("JWT_SECRET") },
    encryptionKey: required("KEY_ENCRYPTION_KEY"),
  };
}
