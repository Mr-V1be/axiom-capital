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
  splits:
    | { mode: "disabled" }
    | {
        mode: "test_fork";
        chainId: 84532;
        networkName: "Base Sepolia Fork";
        rpcUrl: string;
        deployerPrivateKey: `0x${string}`;
        recipientSeed: string;
      };
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function loadSplitsConfig(): AppConfig["splits"] {
  const mode = process.env.SPLITS_MODE?.trim() ?? "disabled";
  if (mode === "disabled") return { mode };
  if (mode !== "test_fork") {
    throw new Error(`Unsupported SPLITS_MODE: ${mode}`);
  }
  const privateKey = required("SPLITS_DEPLOYER_PRIVATE_KEY");
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    throw new Error("SPLITS_DEPLOYER_PRIVATE_KEY must be a 32-byte hex key");
  }
  const rpcUrl = required("SPLITS_RPC_URL");
  const rpcHost = new URL(rpcUrl).hostname;
  if (!["127.0.0.1", "localhost", "::1"].includes(rpcHost)) {
    throw new Error("test_fork Splits RPC must be bound to localhost");
  }
  return {
    mode,
    chainId: 84532,
    networkName: "Base Sepolia Fork",
    rpcUrl,
    deployerPrivateKey: privateKey as `0x${string}`,
    recipientSeed: required("SPLITS_RECIPIENT_SEED"),
  };
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
    splits: loadSplitsConfig(),
  };
}
