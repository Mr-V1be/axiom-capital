import jwt from "@fastify/jwt";
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

export function authPlugin(secret: string): FastifyPluginAsync {
  return async (app: FastifyInstance) => {
    await app.register(jwt, { secret });
    app.addHook("onRequest", async (request) => {
      await request.jwtVerify();
    });
  };
}

export function requestContext(
  request: FastifyRequest,
): RequestContext {
  return {
    tenantId: request.user.tenantId,
    actorId: request.user.sub,
    requestId: request.id,
    ipAddress: request.ip,
  };
}
