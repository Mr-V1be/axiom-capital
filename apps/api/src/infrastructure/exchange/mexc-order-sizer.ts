import { Decimal } from "decimal.js";

export interface MexcOrderSizingInput {
  marketType: "spot" | "swap";
  quoteAmount: string;
  price: string;
  leverage?: number;
  contractSize?: number;
  minimumAmount?: number;
  amountToPrecision(amount: string): string;
}

export interface MexcOrderSize {
  amount: number;
  positionNotional: string;
}

export class MexcOrderSizer {
  calculate(input: MexcOrderSizingInput): MexcOrderSize {
    const quoteAmount = this.positive(input.quoteAmount, "Order amount");
    const price = this.positive(input.price, "Order price");
    const leverage = input.marketType === "swap"
      ? this.leverage(input.leverage ?? 1)
      : new Decimal(1);
    const contractSize = input.marketType === "swap"
      ? this.positive(input.contractSize ?? 1, "Contract size")
      : new Decimal(1);
    const positionNotional = quoteAmount.times(leverage);
    const rawAmount = positionNotional.dividedBy(price).dividedBy(contractSize);
    const amount = new Decimal(input.amountToPrecision(rawAmount.toFixed()));

    this.assertMinimum(amount, input.minimumAmount, contractSize, price);

    return {
      amount: amount.toNumber(),
      positionNotional: positionNotional.toFixed(),
    };
  }

  private assertMinimum(
    amount: Decimal,
    minimum: number | undefined,
    contractSize: Decimal,
    price: Decimal,
  ): void {
    const minimumAmount = new Decimal(minimum ?? 0);
    if (amount.isPositive() && amount.greaterThanOrEqualTo(minimumAmount)) return;

    const required = Decimal.max(minimumAmount, 1)
      .times(contractSize)
      .times(price);
    throw new Error(
      `Position is below MEXC minimum (${required.toSignificantDigits(8)} USDT notional)`,
    );
  }

  private positive(value: Decimal.Value, label: string): Decimal {
    const parsed = new Decimal(value);
    if (!parsed.isFinite() || !parsed.isPositive()) {
      throw new Error(`${label} must be positive`);
    }
    return parsed;
  }

  private leverage(value: number): Decimal {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error("Leverage must be a positive integer");
    }
    return new Decimal(value);
  }
}
