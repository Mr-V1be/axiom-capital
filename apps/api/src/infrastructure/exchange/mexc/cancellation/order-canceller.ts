interface CancellableExchange {
  cancelOrder(orderId: string, symbol: string): Promise<unknown>;
  fetchOpenOrders(symbol: string): Promise<Array<{ id: string | undefined }>>;
}

type Wait = (milliseconds: number) => Promise<void>;

export class MexcOrderCanceller {
  constructor(
    private readonly wait: Wait = delay,
    private readonly attempts = 2,
  ) {}

  async cancel(
    exchange: CancellableExchange,
    orderId: string,
    symbol: string,
  ): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt < this.attempts; attempt += 1) {
      try {
        await exchange.cancelOrder(orderId, symbol);
        return;
      } catch (error) {
        lastError = error;
        if (!(await this.isOpen(exchange, orderId, symbol))) return;
        if (attempt + 1 < this.attempts) await this.wait(300);
      }
    }
    throw lastError;
  }

  private async isOpen(
    exchange: CancellableExchange,
    orderId: string,
    symbol: string,
  ): Promise<boolean> {
    try {
      const orders = await exchange.fetchOpenOrders(symbol);
      return orders.some((order) => String(order.id) === orderId);
    } catch {
      return true;
    }
  }
}

const delay: Wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
