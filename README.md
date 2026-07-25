# Axiom Capital

Production-oriented multi-account trading and profit-settlement platform.

## Architecture

The repository is a modular monolith with explicit bounded contexts:

- `accounts` — investor exchange connections and permissions;
- `portfolio` — balances, equity and performance snapshots;
- `trading` — proportional execution and idempotent order orchestration;
- `risk` — pre-trade policies and account-level limits;
- `settlements` — high-water-mark accounting and payout workflow;
- `audit` — immutable security and business events.

Domain code depends only on ports. Fastify, Prisma, MEXC/CCXT and encryption
live behind adapters. The web client consumes shared, versioned contracts.

## Execution guarantees

- A fixed quote order is weighted by account equity; the final account receives
  the decimal residual, so the allocations equal the requested total.
- Spot and USDT-M futures accounts cannot be mixed in one batch.
- Risk limits are evaluated per account using its current equity and live open
  position count before any batch is reserved.
- Each exchange order has an idempotency key and stores filled, remaining,
  average-price and synchronization state.
- Open limit orders can be synchronized or cancelled per account.
- A settlement cannot enter the funding workflow when its displayed share
  differs from the verified immutable Split configuration.

The hosted UI uses a deterministic demo gateway. Real MEXC execution requires
trade-only, withdrawal-disabled API keys and an IP allowlist. Real Splits
funding requires a verified current-generation contract configuration.

## Connection modes

- `read_only` verifies private account access and stores encrypted credentials,
  but the execution boundary rejects every order attempt for that account.
- `trade` permits order execution after account-level risk checks. Withdrawal
  and transfer capabilities are outside the platform's exchange gateway.

Production can place both the static application and `/api` behind HTTP Basic
authentication by setting `AUTH_MODE=basic`. The API independently validates
the same credentials; Nginx protection is not treated as the sole trust
boundary.

## Local development

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL.
3. Run `npm install`.
4. Run `npm run db:generate` and `npm run db:migrate`.
5. Run `npm run dev`.

`npm test` also enforces the repository rules: no source file over 250 lines
and no directory with more than seven direct files.
