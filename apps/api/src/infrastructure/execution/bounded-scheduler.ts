import { ExecutionScheduler } from "../../domain/trading/trading-ports.js";

export class BoundedExecutionScheduler implements ExecutionScheduler {
  constructor(private readonly concurrency: number) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new Error("Concurrency must be a positive integer");
    }
  }

  async map<T, R>(
    items: readonly T[],
    task: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let cursor = 0;

    const worker = async () => {
      while (cursor < items.length) {
        const index = cursor++;
        const item = items[index];
        if (item !== undefined) results[index] = await task(item);
      }
    };

    const workers = Array.from(
      { length: Math.min(this.concurrency, items.length) },
      () => worker(),
    );
    await Promise.all(workers);
    return results;
  }
}
