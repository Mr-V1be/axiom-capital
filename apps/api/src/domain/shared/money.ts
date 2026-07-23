import { Decimal } from "decimal.js";

export class Money {
  private constructor(
    private readonly value: Decimal,
    readonly currency: string,
  ) {}

  static of(amount: Decimal.Value, currency: string): Money {
    const normalizedCurrency = currency.trim().toUpperCase();
    if (!normalizedCurrency) throw new Error("Currency is required");

    const value = new Decimal(amount);
    if (!value.isFinite()) throw new Error("Money must be finite");
    return new Money(value, normalizedCurrency);
  }

  static zero(currency: string): Money {
    return Money.of(0, currency);
  }

  add(other: Money): Money {
    this.assertCurrency(other);
    return Money.of(this.value.plus(other.value), this.currency);
  }

  subtract(other: Money): Money {
    this.assertCurrency(other);
    return Money.of(this.value.minus(other.value), this.currency);
  }

  multiply(multiplier: Decimal.Value): Money {
    return Money.of(this.value.times(multiplier), this.currency);
  }

  percentage(percent: Decimal.Value): Money {
    return this.multiply(new Decimal(percent).dividedBy(100));
  }

  max(other: Money): Money {
    this.assertCurrency(other);
    return this.value.greaterThan(other.value) ? this : other;
  }

  isPositive(): boolean {
    return this.value.greaterThan(0);
  }

  isNegative(): boolean {
    return this.value.lessThan(0);
  }

  compare(other: Money): number {
    this.assertCurrency(other);
    return this.value.comparedTo(other.value);
  }

  toString(): string {
    return this.value.toFixed();
  }

  private assertCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency}/${other.currency}`);
    }
  }
}
