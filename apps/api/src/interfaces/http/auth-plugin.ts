import jwt from "@fastify/jwt";
import { timingSafeEqual } from "node:crypto";
import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyRequest,
} from "fastify";
import { RequestContext } from "../../application/shared/context.js";

interface AuthClaims {
  sub: string;
  tenantId: string;
  role: "owner" | "trader" | "viewer";
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthClaims;
    user: AuthClaims;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    authContext: AuthClaims;
  }
}

export type AuthConfig =
  | { mode: "jwt"; jwtSecret: string }
  | {
      mode: "basic";
      username: string;
      password: string;
      tenantId: string;
      actorId: string;
    };

export function authPlugin(config: AuthConfig): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    app.decorateRequest("authContext");
    if (config.mode === "jwt") {
      await app.register(jwt, { secret: config.jwtSecret });
      app.addHook("onRequest", async (request) => {
        await request.jwtVerify();
        request.authContext = request.user;
      });
      return;
    }
    app.addHook("onRequest", async (request, reply) => {
      const credentials = parseBasicAuthorization(request.headers.authorization);
      if (
        !credentials ||
        !constantTimeEqual(credentials.username, config.username) ||
        !constantTimeEqual(credentials.password, config.password)
      ) {
        await reply
          .status(401)
          .header("www-authenticate", 'Basic realm="Axiom Capital"')
          .send({ code: "UNAUTHORIZED", message: "Authentication required" });
        return;
      }
      request.authContext = {
        sub: config.actorId,
        tenantId: config.tenantId,
        role: "owner",
      };
    });
  };
}

export function requestContext(
  request: FastifyRequest,
): RequestContext {
  return {
    tenantId: request.authContext.tenantId,
    actorId: request.authContext.sub,
    requestId: request.id,
    ipAddress: request.ip,
  };
}

function parseBasicAuthorization(value: string | undefined) {
  if (!value?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(value.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 1) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer);
}
