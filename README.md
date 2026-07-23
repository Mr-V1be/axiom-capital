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

## Local development

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL.
3. Run `npm install`.
4. Run `npm run db:generate` and `npm run db:migrate`.
5. Run `npm run dev`.

`npm test` also enforces the repository rules: no source file over 250 lines
and no directory with more than seven direct files.
