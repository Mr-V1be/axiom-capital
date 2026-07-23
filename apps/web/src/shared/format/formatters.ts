export function formatMoney(
  amount: string | number,
  currency = "USDT",
  options?: { sign?: boolean; compact?: boolean },
): string {
  const value = Number(amount);
  const formatted = new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: options?.compact ? 0 : 2,
    maximumFractionDigits: options?.compact ? 1 : 2,
    notation: options?.compact ? "compact" : "standard",
  }).format(Math.abs(value));
  const prefix = options?.sign && value !== 0 ? (value > 0 ? "+" : "−") : "";
  return `${prefix}$${formatted} ${currency === "USDT" ? "" : currency}`.trim();
}

export function formatPercent(value: number, sign = false): string {
  const prefix = sign && value > 0 ? "+" : "";
  return `${prefix}${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function maskAddress(value: string): string {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
