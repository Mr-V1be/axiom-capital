import type { MarketQuoteDto } from "@axiom/contracts";
import { RefreshCw } from "lucide-react";
import { formatTime } from "../../shared/format/formatters";

interface Props {
  quote: MarketQuoteDto | null;
  loading: boolean;
  symbol: string;
  onRefresh(): void;
}

const price = (value: string) =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 8,
  }).format(Number(value));

const compact = (value: string | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("ru-RU", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(Number(value));

export function MarketStrip({
  quote,
  loading,
  symbol,
  onRefresh,
}: Props) {
  const [base, quoteAsset] = symbol.split("/");
  const change = quote?.changePercent24h;
  return (
    <div className="market-strip">
      <div className="market-pair">
        <span className="asset-icon">{base === "BTC" ? "₿" : "Ξ"}</span>
        <div><strong>{base} / {quoteAsset}</strong><span>MEXC</span></div>
      </div>
      <div>
        <span>Цена</span>
        <strong>{quote ? price(quote.price) : "—"}</strong>
      </div>
      <div>
        <span>24ч</span>
        <strong className={
          change === null || change === undefined
            ? ""
            : change >= 0 ? "positive" : "negative"
        }>
          {change === null || change === undefined
            ? "—"
            : `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}
        </strong>
      </div>
      <div>
        <span>Объём 24ч</span>
        <strong>{compact(quote?.quoteVolume24h ?? null)}</strong>
        {quote && <small>Обновлено {formatTime(quote.updatedAt)}</small>}
      </div>
      <button
        className="icon-button"
        onClick={onRefresh}
        disabled={loading}
      >
        <RefreshCw className={loading ? "spin" : ""} size={16} />
        <span className="visually-hidden">Обновить котировку</span>
      </button>
    </div>
  );
}
