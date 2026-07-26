import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { useDataGateway } from "../../shared/data/gateway-context";
import {
  formatMoney,
  formatPercent,
  formatTime,
} from "../../shared/format/formatters";
import { usePollingQuery } from "../../shared/hooks/use-polling-query";

export function PositionsPanel() {
  const gateway = useDataGateway();
  const positions = usePollingQuery(
    (signal) => gateway.listPositions(signal),
    [gateway],
    5_000,
  );
  const data = positions.data;

  return (
    <section className="panel positions-panel">
      <header className="panel__header positions-panel__header">
        <div>
          <span className="eyebrow">MEXC Futures</span>
          <h2>Открытые позиции</h2>
        </div>
        <div className="positions-panel__live">
          <span className="live-indicator"><i />Live · 5 сек.</span>
          {data && <small>Обновлено {formatTime(data.updatedAt)}</small>}
          <button
            className="icon-button"
            aria-label="Обновить позиции"
            onClick={() => void positions.refresh()}
            disabled={positions.status === "loading"}
          >
            <RefreshCw
              size={16}
              className={positions.status === "loading" ? "is-spinning" : ""}
            />
          </button>
        </div>
      </header>

      {positions.error && !data && (
        <div className="positions-panel__state positions-panel__state--error">
          <AlertTriangle size={18} />
          <span>{positions.error.message}</span>
          <button onClick={() => void positions.refresh()}>Повторить</button>
        </div>
      )}
      {!data && !positions.error && (
        <div className="positions-panel__state">
          <span className="spinner" /> Получаем позиции MEXC
        </div>
      )}
      {data && data.failures.length > 0 && (
        <div className="positions-panel__warning">
          <AlertTriangle size={15} />
          Не обновлены: {data.failures.map((item) => item.accountLabel).join(", ")}
        </div>
      )}
      {data && data.items.length === 0 && (
        <div className="positions-panel__state">
          Открытых фьючерсных позиций нет
        </div>
      )}
      {data && data.items.length > 0 && (
        <div className="positions-table-wrap">
          <table className="positions-table">
            <thead>
              <tr>
                <th>Счёт / контракт</th>
                <th>Сторона</th>
                <th>Размер</th>
                <th>Вход / сейчас</th>
                <th>Маржа / плечо</th>
                <th>PnL / ROE</th>
                <th>Ликвидация</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((position) => {
                const pnl = Number(position.unrealizedPnl ?? 0);
                const positive = pnl >= 0;
                return (
                  <tr key={`${position.accountId}:${position.id}`}>
                    <td>
                      <strong>{cleanSymbol(position.symbol)}</strong>
                      <small>
                        {position.investorName} · {position.accountLabel}
                      </small>
                    </td>
                    <td>
                      <span className={`position-side position-side--${position.side}`}>
                        {position.side === "long"
                          ? <ArrowUpRight size={13} />
                          : <ArrowDownRight size={13} />}
                        {position.side === "long" ? "Long" : "Short"}
                      </span>
                      <small>{marginMode(position.marginMode)}</small>
                    </td>
                    <td>
                      <strong>{position.baseAmount} BTC</strong>
                      <small>{position.contracts} контр.</small>
                    </td>
                    <td>
                      <strong>{price(position.entryPrice)}</strong>
                      <small>{price(position.currentPrice)}</small>
                    </td>
                    <td>
                      <strong>{money(position.initialMargin)}</strong>
                      <small>×{position.leverage ?? "—"}</small>
                    </td>
                    <td>
                      <strong className={positive ? "positive" : "negative"}>
                        {formatMoney(position.unrealizedPnl ?? "0", "USDT", {
                          sign: true,
                        })}
                      </strong>
                      <small className={positive ? "positive" : "negative"}>
                        {percent(position.roePercent)}
                      </small>
                    </td>
                    <td>
                      <strong>{price(position.liquidationPrice)}</strong>
                      <small>MR {percent(position.marginRatioPercent, false)}</small>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function cleanSymbol(symbol: string): string {
  return symbol.split(":")[0] ?? symbol;
}

function price(value: string | null): string {
  if (value === null) return "—";
  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 4,
  }).format(Number(value))} $`;
}

function money(value: string | null): string {
  return value === null ? "—" : formatMoney(value);
}

function percent(value: string | null, sign = true): string {
  return value === null ? "—" : formatPercent(Number(value), sign);
}

function marginMode(value: "cross" | "isolated" | null): string {
  if (value === "cross") return "Кросс-маржа";
  if (value === "isolated") return "Изолированная";
  return "Режим не определён";
}
