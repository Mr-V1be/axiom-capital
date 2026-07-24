import type { PlaceBatchOrderInput } from "@axiom/contracts";
import { AlertTriangle, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { formatMoney } from "../../shared/format/formatters";
import { Button } from "../../shared/ui/Button";

interface Props {
  accountIds: readonly string[];
  totalEquity: number;
  marketType?: "spot" | "swap";
  mixedMarkets: boolean;
  loading: boolean;
  onSubmit(input: PlaceBatchOrderInput): Promise<void>;
}

export function OrderTicket({
  accountIds,
  totalEquity,
  marketType,
  mixedMarkets,
  loading,
  onSubmit,
}: Props) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [type, setType] = useState<"market" | "limit">("limit");
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [allocationMode, setAllocationMode] = useState<
    "equity_percentage" | "fixed_quote"
  >("fixed_quote");
  const [allocation, setAllocation] = useState(5);
  const [fixedAmount, setFixedAmount] = useState("1000");
  const [price, setPrice] = useState("118420");
  const [leverage, setLeverage] = useState(1);
  const amount = useMemo(
    () => allocationMode === "fixed_quote"
      ? Number(fixedAmount)
      : totalEquity * (allocation / 100),
    [allocationMode, allocation, fixedAmount, totalEquity],
  );
  const valid = accountIds.length > 0 && !mixedMarkets && amount > 0 &&
    amount <= totalEquity && (
      allocationMode === "fixed_quote" || allocation <= 10
    );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    const common = {
      idempotencyKey: crypto.randomUUID(),
      accountIds: [...accountIds],
      symbol,
      side,
      type,
      ...(type === "limit" ? { limitPrice: price } : {}),
      ...(marketType === "swap" ? {
        leverage,
        marginMode: "cross" as const,
        reduceOnly: false,
      } : {}),
    };
    const input: PlaceBatchOrderInput = allocationMode === "fixed_quote"
      ? { ...common, allocationMode, totalQuoteAmount: fixedAmount }
      : { ...common, allocationMode, allocationPercent: allocation };
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
          <span>Режим аллокации</span>
          <select
            value={allocationMode}
            onChange={(event) => setAllocationMode(
              event.target.value as "equity_percentage" | "fixed_quote",
            )}
          >
            <option value="fixed_quote">Общая сумма</option>
            <option value="equity_percentage">% каждого счёта</option>
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label className="field">
          <span>{allocationMode === "fixed_quote" ? "Общая сумма" : "Доля счёта"}</span>
          <div className="input-suffix">
            <input
              type="number"
              min={0.1}
              max={allocationMode === "fixed_quote" ? totalEquity : 10}
              step={0.1}
              value={allocationMode === "fixed_quote" ? fixedAmount : allocation}
              onChange={(event) => allocationMode === "fixed_quote"
                ? setFixedAmount(event.target.value)
                : setAllocation(Number(event.target.value))}
            />
            <span>{allocationMode === "fixed_quote" ? "USDT" : "%"}</span>
          </div>
        </label>
        {marketType === "swap" && (
          <label className="field">
            <span>Плечо</span>
            <select
              value={leverage}
              onChange={(event) => setLeverage(Number(event.target.value))}
            >
              {[1, 2, 3, 5, 10, 20].map((value) => (
                <option key={value} value={value}>×{value}</option>
              ))}
            </select>
          </label>
        )}
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
              ? "Сумма распределится пропорционально equity выбранных счетов"
              : mixedMarkets
                ? "Нельзя смешивать spot и futures в одной пакетной заявке"
                : "Выберите счёт и проверьте лимит распределения"}
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
