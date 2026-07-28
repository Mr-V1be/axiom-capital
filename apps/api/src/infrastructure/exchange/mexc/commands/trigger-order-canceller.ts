import { mexc } from "ccxt";

export class MexcTriggerOrderCanceller {
  constructor(private readonly exchange: mexc) {}

  async cancel(orderId: string, symbol: string): Promise<void> {
    await this.exchange.loadMarkets();
    const market = this.exchange.market(symbol);
    const response = await this.exchange.contractPrivatePostPlanorderCancel([
      { symbol: market.id, orderId },
    ]) as { success?: boolean; message?: string };
    if (response.success !== true) {
      throw new Error(response.message || "MEXC не отменила защитную заявку");
    }
  }
}
