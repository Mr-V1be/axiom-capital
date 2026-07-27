interface OrderValidationInput {
  accountEquities: readonly number[];
  totalEquity: number;
  mixedMarkets: boolean;
  amount: number;
  allocationMode: "equity_percentage" | "fixed_quote";
  allocationPercent: number;
  marketType: "spot" | "swap";
  leverage: number;
  type: "market" | "limit";
  limitPrice: number;
  marketPrice: number;
  minimumOrderAmount: number | null;
  contractSize: number | null;
  maxAllocationPercent: number;
}

export interface OrderValidation {
  valid: boolean;
  message: string;
}

export function validateOrder(input: OrderValidationInput): OrderValidation {
  if (input.accountEquities.length === 0) {
    return { valid: false, message: "Выберите счёт с режимом Trade" };
  }
  if (input.mixedMarkets) {
    return {
      valid: false,
      message: "Нельзя смешивать Spot и Futures в одной заявке",
    };
  }
  if (input.totalEquity <= 0) {
    return {
      valid: false,
      message: "На выбранных счетах нет доступного USDT",
    };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { valid: false, message: "Введите положительную сумму сделки" };
  }
  if (input.amount > input.totalEquity) {
    return { valid: false, message: "Сумма превышает доступный капитал" };
  }
  const portfolioPercent = input.amount / input.totalEquity * 100;
  if (
    input.allocationPercent > input.maxAllocationPercent ||
    (
      input.allocationMode === "fixed_quote" &&
      portfolioPercent > input.maxAllocationPercent
    )
  ) {
    return {
      valid: false,
      message:
        `Текущий риск-лимит — не более ${input.maxAllocationPercent}% капитала счёта`,
    };
  }
  if (
    input.type === "limit" &&
    (!Number.isFinite(input.limitPrice) || input.limitPrice <= 0)
  ) {
    return { valid: false, message: "Укажите положительную лимитную цену" };
  }
  const minimumError = validateSwapMinimum(input);
  if (minimumError) return minimumError;

  return {
    valid: true,
    message: input.marketType === "swap"
      ? `Маржа ${input.amount.toFixed(2)} USDT · позиция ${(input.amount * input.leverage).toFixed(2)} USDT`
      : "Сумма распределится пропорционально капиталу счетов",
  };
}

function validateSwapMinimum(
  input: OrderValidationInput,
): OrderValidation | null {
  if (
    input.marketType !== "swap" ||
    !input.minimumOrderAmount ||
    !input.contractSize
  ) return null;

  const price = input.type === "limit" ? input.limitPrice : input.marketPrice;
  if (!Number.isFinite(price) || price <= 0) {
    return { valid: false, message: "Дождитесь актуальной котировки MEXC" };
  }
  const minimumNotional = input.minimumOrderAmount * input.contractSize * price;
  const margins = input.allocationMode === "fixed_quote"
    ? input.accountEquities.map((equity) =>
      input.amount * equity / input.totalEquity
    )
    : input.accountEquities.map((equity) =>
      equity * input.allocationPercent / 100
    );
  if (margins.some((margin) => margin * input.leverage < minimumNotional)) {
    return {
      valid: false,
      message: `Минимум MEXC — ${minimumNotional.toFixed(2)} USDT позиции на каждый счёт`,
    };
  }
  return null;
}
