import {
  AccountListResponse,
  ConnectAccountBody,
  InvestorAccount,
  PageQuery,
} from "@axiom/contracts";
import { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { ConnectAccount } from "../../application/accounts/connect-account.js";
import { ListAccounts } from "../../application/accounts/list-accounts.js";
import { requestContext } from "./auth-plugin.js";
import { accountDto } from "./presenters.js";

export interface AccountRouteDependencies {
  connectAccount: ConnectAccount;
  listAccounts: ListAccounts;
}

export function accountRoutes(
  dependencies: AccountRouteDependencies,
): FastifyPluginAsyncTypebox {
  return async (app) => {
    app.get(
      "/accounts",
      {
        schema: {
          querystring: PageQuery,
          response: { 200: AccountListResponse },
        },
      },
      async (request) => {
        const result = await dependencies.listAccounts.execute(
          requestContext(request),
          {
            limit: request.query.limit ?? 25,
            ...(request.query.cursor ? { cursor: request.query.cursor } : {}),
          },
        );
        return {
          items: result.items.map(({ account, balance }) =>
            accountDto(account, balance),
          ),
          ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
        };
      },
    );

    app.post(
      "/accounts",
      {
        schema: {
          body: ConnectAccountBody,
          response: { 201: InvestorAccount },
        },
      },
      async (request, reply) => {
        const state = await dependencies.connectAccount.execute(
          requestContext(request),
          request.body,
        );
        return reply.status(201).send(accountDto(state, null));
      },
    );

    app.get("/accounts/health", {
      schema: { response: { 200: Type.Object({ ok: Type.Boolean() }) } },
      handler: async () => ({ ok: true }),
    });
  };
}
