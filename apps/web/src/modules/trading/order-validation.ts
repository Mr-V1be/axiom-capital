interface OrderValidationInput {
  accountCount: number;
  totalEquity: number;
  mixedMarkets: boolean;
  amount: number;
  allocationMode: "equity_percentage" | "fixed_quote";
  allocationPercent: number;
  type: "market" | "limit";
  limitPrice: number;
}

export interface OrderValidation {
  valid: boolean;
  message: string;
}

export function validateOrder(input: OrderValidationInput): OrderValidation {
  if (input.accountCount === 0) {
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
    input.allocationPercent > 10 ||
    (input.allocationMode === "fixed_quote" && portfolioPercent > 10)
  ) {
    return {
      valid: false,
      message: "Текущий риск-лимит — не более 10% капитала счёта",
    };
  }
  if (
    input.type === "limit" &&
    (!Number.isFinite(input.limitPrice) || input.limitPrice <= 0)
  ) {
    return { valid: false, message: "Укажите положительную лимитную цену" };
  }
  return {
    valid: true,
    message: "Сумма распределится пропорционально капиталу счетов",
  };
}
