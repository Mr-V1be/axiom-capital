import assert from "node:assert/strict";
import { it } from "node:test";
import Fastify from "fastify";
import {
  authPlugin,
  requestContext,
} from "../interfaces/http/auth-plugin.js";

it("applies Basic authentication to protected sibling routes", async () => {
  const app = Fastify();
  await app.register(async (protectedApp) => {
    await authPlugin({
      mode: "basic",
      username: "operator",
      password: "strong-password",
      tenantId: "tenant-test",
      actorId: "actor-test",
    })(protectedApp, {});
    protectedApp.get("/protected", async (request) => requestContext(request));
  });

  const rejected = await app.inject({ method: "GET", url: "/protected" });
  assert.equal(rejected.statusCode, 401);

  const authorization = Buffer.from("operator:strong-password").toString("base64");
  const accepted = await app.inject({
    method: "GET",
    url: "/protected",
    headers: { authorization: `Basic ${authorization}` },
  });
  assert.equal(accepted.statusCode, 200);
  const context = accepted.json();
  assert.equal(context.tenantId, "tenant-test");
  assert.equal(context.actorId, "actor-test");
  assert.equal(context.ipAddress, "127.0.0.1");
  assert.ok(context.requestId);
  await app.close();
});
