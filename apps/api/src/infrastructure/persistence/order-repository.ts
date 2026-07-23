import { Money } from "../../domain/shared/money.js";
import { Order, OrderBatch, OrderStatus } from "../../domain/trading/order.js";
import { OrderRepository } from "../../domain/trading/trading-ports.js";
import { OrderStatus as DbOrderStatus } from "../../generated/prisma/enums.js";
import type { Order as DbOrder } from "../../generated/prisma/client.js";
import { Database } from "./prisma-client.js";

const toDbStatus: Record<OrderStatus, DbOrderStatus> = {
  pending: "PENDING",
  accepted: "ACCEPTED",
  rejected: "REJECTED",
  failed: "FAILED",
  filled: "FILLED",
  cancelled: "CANCELLED",
};

const toDomainStatus: Record<DbOrderStatus, OrderStatus> = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  FAILED: "failed",
  FILLED: "filled",
  CANCELLED: "cancelled",
};

function isUniqueConstraint(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly db: Database) {}

  async findByIdempotencyKey(tenantId: string, idempotencyKey: string) {
    const row = await this.db.orderBatch.findUnique({
      where: { tenantId_idempotencyKey: { tenantId, idempotencyKey } },
      include: { orders: true },
    });
    if (!row) return null;
    return OrderBatch.create({
      id: row.id,
      tenantId: row.tenantId,
      idempotencyKey: row.idempotencyKey,
      symbol: row.symbol,
      side: row.side as "buy" | "sell",
      type: row.type as "market" | "limit",
      allocationPercent: Number(row.allocationPct),
      submittedAt: row.submittedAt,
      orders: row.orders.map((item: DbOrder) => {
        const order = Order.pending({
          id: item.id,
          batchId: item.batchId,
          accountId: item.accountId,
          allocated: Money.of(item.allocatedAmount.toString(), item.currency),
        });
        const status = toDomainStatus[item.status as DbOrderStatus];
        if (status === "accepted" || status === "filled") {
          order.accept(item.exchangeOrderId ?? "unknown", status === "filled");
        } else if (status === "rejected") {
          order.reject(item.failureReason ?? "Rejected");
        } else if (status === "failed") {
          order.fail(item.failureReason ?? "Failed");
        }
        return order;
      }),
    });
  }

  async reserve(batch: OrderBatch): Promise<OrderBatch> {
    const state = batch.snapshot();
    try {
      await this.db.$transaction([
        this.db.orderBatch.create({
          data: {
            id: state.id,
            tenantId: state.tenantId,
            idempotencyKey: state.idempotencyKey,
            symbol: state.symbol,
            side: state.side,
            type: state.type,
            allocationPct: state.allocationPercent,
            submittedAt: state.submittedAt,
          },
        }),
        this.db.order.createMany({
          data: state.orders.map((order) => {
            const item = order.snapshot();
            return {
              id: item.id,
              batchId: state.id,
              accountId: item.accountId,
              exchangeOrderId: item.exchangeOrderId ?? null,
              status: toDbStatus[item.status],
              allocatedAmount: item.allocated.toString(),
              currency: item.allocated.currency,
              failureReason: item.failureReason ?? null,
            };
          }),
        }),
      ]);
      return batch;
    } catch (error) {
      if (isUniqueConstraint(error)) {
        const existing = await this.findByIdempotencyKey(
          state.tenantId,
          state.idempotencyKey,
        );
        if (existing) return existing;
      }
      throw error;
    }
  }

  async update(batch: OrderBatch): Promise<void> {
    await this.db.$transaction(
      batch.snapshot().orders.map((order) => {
        const item = order.snapshot();
        return this.db.order.update({
          where: { id: item.id },
          data: {
            exchangeOrderId: item.exchangeOrderId ?? null,
            status: toDbStatus[item.status],
            failureReason: item.failureReason ?? null,
          },
        });
      }),
    );
  }
}
