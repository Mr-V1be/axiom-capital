import type { PlaceBatchOrderInput } from "@axiom/contracts";
import { AlertTriangle, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { formatMoney } from "../../shared/format/formatters";
import { Button } from "../../shared/ui/Button";

interface Props {
  accountIds: readonly string[];
  totalEquity: number;
  loading: boolean;
  onSubmit(input: PlaceBatchOrderInput): Promise<void>;
}

export function OrderTicket({
  accountIds,
  totalEquity,
  loading,
  onSubmit,
}: Props) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"market" | "limit">("market");
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [allocation, setAllocation] = useState(5);
  const [price, setPrice] = useState("118420");
  const amount = useMemo(
    () => totalEquity * (allocation / 100),
    [totalEquity, allocation],
  );
  const valid = accountIds.length > 0 && allocation > 0 && allocation <= 10;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    const input: PlaceBatchOrderInput = {
      idempotencyKey: crypto.randomUUID(),
      accountIds: [...accountIds],
      symbol,
      side,
      type,
      allocationPercent: allocation,
      ...(type === "limit" ? { limitPrice: price } : {}),
    };
    await onSubmit(input);
  };

  return (
    <form className="order-ticket panel" onSubmit={submit}>
      <header className="panel__header">
        <div>
          <span className="eyebrow">Ордер</span>
          <h2>Параметры сделки</h2>
        </div>
        <span className="live-indicator"><i /> MEXC live</span>
      </header>
      <div className="side-switcher">
        <button
          type="button"
          className={side === "buy" ? "buy active" : ""}
          onClick={() => setSide("buy")}
        >
          Купить
        </button>
        <button
          type="button"
          className={side === "sell" ? "sell active" : ""}
          onClick={() => setSide("sell")}
        >
          Продать
        </button>
      </div>
      <label className="field">
        <span>Торговая пара</span>
        <select value={symbol} onChange={(event) => setSymbol(event.target.value)}>
          <option>BTC/USDT</option>
          <option>ETH/USDT</option>
        </select>
      </label>
      <div className="form-grid">
        <label className="field">
          <span>Тип ордера</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as "market" | "limit")}
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </label>
        <label className="field">
          <span>Распределение</span>
          <div className="input-suffix">
            <input
              type="number"
              min={0.1}
              max={10}
              step={0.1}
              value={allocation}
              onChange={(event) => setAllocation(Number(event.target.value))}
            />
            <span>%</span>
          </div>
        </label>
      </div>
      {type === "limit" && (
        <label className="field">
          <span>Лимитная цена</span>
          <div className="input-suffix">
            <input
              type="number"
              min={0}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
            <span>USDT</span>
          </div>
        </label>
      )}
      <div className="allocation-preview">
        <div>
          <span>Сумма по выбранным счетам</span>
          <strong>{formatMoney(amount)}</strong>
        </div>
        <div>
          <span>Счетов в исполнении</span>
          <strong>{accountIds.length}</strong>
        </div>
      </div>
      <div className={`risk-check ${valid ? "" : "risk-check--warning"}`}>
        {valid ? <ShieldCheck size={19} /> : <AlertTriangle size={19} />}
        <div>
          <strong>{valid ? "Pre-trade проверка пройдена" : "Проверьте параметры"}</strong>
          <span>
            {valid
              ? "Лимиты позиции, дневного убытка и разрешённых пар соблюдены"
              : "Выберите счёт и не превышайте лимит распределения 10%"}
          </span>
        </div>
        {valid && <CheckCircle2 size={17} />}
      </div>
      <Button
        variant="primary"
        className="order-ticket__submit"
        loading={loading}
        disabled={!valid}
      >
        <Zap size={16} />
        Отправить на {accountIds.length} счёта
      </Button>
      <p className="order-ticket__notice">
        Каждый ордер получает уникальный idempotency key. Повторная отправка не
        создаст дубликат сделки.
      </p>
    </form>
  );
}
