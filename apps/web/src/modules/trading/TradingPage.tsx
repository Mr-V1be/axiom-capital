import type { PlaceBatchOrderInput } from "@axiom/contracts";
import { Check, CircleDollarSign, RotateCw, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDataGateway } from "../../shared/data/gateway-context";
import { formatMoney } from "../../shared/format/formatters";
import { useMutation, useQuery } from "../../shared/hooks/use-async";
import { ErrorState, LoadingState } from "../../shared/ui/DataState";
import { Button } from "../../shared/ui/Button";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { Toast } from "../../shared/ui/Toast";
import { OrderTicket } from "./OrderTicket";
import { MarketStrip } from "./MarketStrip";

export default function TradingPage() {
  const gateway = useDataGateway();
  const accounts = useQuery((signal) => gateway.listAccounts(signal), [gateway]);
  const order = useMutation((input: PlaceBatchOrderInput) =>
    gateway.placeBatchOrder(input),
  );
  const lifecycle = useMutation(
    (input: { action: "sync" | "cancel"; batchId: string }) =>
      input.action === "sync"
        ? gateway.syncBatchOrder(input.batchId)
        : gateway.cancelBatchOrder(input.batchId, {}),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [toast, setToast] = useState<string | null>(null);
  const selectionInitialized = useRef(false);

  useEffect(() => {
    if (!accounts.data) return;
    const eligible = new Set(
      accounts.data.items
        .filter((account) =>
          account.status === "connected" && account.permissions.trade
        )
        .map((account) => account.id),
    );
    setSelected((current) => {
      if (!selectionInitialized.current) {
        selectionInitialized.current = true;
        return eligible;
      }
      return new Set([...current].filter((id) => eligible.has(id)));
    });
  }, [accounts.data]);

  const selectedAccounts = useMemo(
    () => (accounts.data?.items ?? []).filter((item) => selected.has(item.id)),
    [accounts.data, selected],
  );
  const equity = selectedAccounts.reduce(
    (sum, account) => sum + Number(account.equity.amount),
    0,
  );
  const marketTypes = new Set(selectedAccounts.map((item) => item.marketType));
  const marketType = selectedAccounts[0]?.marketType;
  const quote = useQuery(
    (signal) =>
      gateway.getMarketQuote(symbol, marketType ?? "spot", signal),
    [gateway, symbol, marketType],
  );
  const batch = lifecycle.data?.batchId === order.data?.batchId
    ? lifecycle.data
    : order.data;

  if (accounts.status === "loading" && !accounts.data) {
    return <LoadingState label="Синхронизируем торговые счета" />;
  }
  if (accounts.error) {
    return <ErrorState error={accounts.error} retry={accounts.refresh} />;
  }

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submit = async (input: PlaceBatchOrderInput) => {
    const result = await order.execute(input);
    const accepted = result.results.filter((item) =>
      ["accepted", "partially_filled", "filled"].includes(item.status)
    ).length;
    setToast(`Ордер принят на ${accepted} из ${result.results.length} счетов`);
  };

  return (
    <div className="trading-layout">
      <section className="trading-main page-stack">
        <MarketStrip
          quote={quote.data}
          loading={quote.status === "loading"}
          symbol={symbol}
          onRefresh={() => void quote.refresh()}
        />
        {quote.error && <p className="form-error">{quote.error.message}</p>}

        <section className="panel">
          <header className="panel__header">
            <div>
              <span className="eyebrow">Распределение</span>
              <h2>Счета для исполнения</h2>
            </div>
            <span className="selection-summary">
              {selected.size} выбрано · {formatMoney(equity)}
            </span>
          </header>
          <div className="account-selector">
            {(accounts.data?.items ?? []).map((account) => {
              const active = selected.has(account.id);
              const disabled =
                account.status !== "connected" || !account.permissions.trade;
              return (
                <button
                  key={account.id}
                  className={active ? "selected" : ""}
                  disabled={disabled}
                  onClick={() => toggle(account.id)}
                >
                  <span className="selector-check">
                    {active && <Check size={13} strokeWidth={3} />}
                  </span>
                  <span className="avatar avatar--small">
                    {account.investorName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="selector-person">
                    <strong>{account.investorName}</strong>
                    <small>
                      {account.label} ·{" "}
                      {account.permissions.trade ? "Trade" : "Read only"}
                    </small>
                  </span>
                  <strong>{formatMoney(account.equity.amount)}</strong>
                  <StatusBadge status={account.status} />
                </button>
              );
            })}
          </div>
        </section>

        {batch && (
          <section className="panel execution-panel">
            <header className="panel__header">
              <div>
                <span className="eyebrow">Batch {batch.batchId.slice(-8)}</span>
                <h2>Результат исполнения</h2>
              </div>
              <div className="panel-actions">
                <Button
                  loading={lifecycle.status === "loading"}
                  onClick={() => lifecycle.execute({
                    action: "sync",
                    batchId: batch.batchId,
                  })}
                >
                  <RotateCw size={15} /> Синхронизировать
                </Button>
                <Button
                  disabled={batch.type !== "limit"}
                  onClick={() => lifecycle.execute({
                    action: "cancel",
                    batchId: batch.batchId,
                  })}
                >
                  <XCircle size={15} /> Снять лимитки
                </Button>
              </div>
            </header>
            <div className="execution-grid">
              {batch.results.map((result) => {
                const account = accounts.data?.items.find(
                  (item) => item.id === result.accountId,
                );
                return (
                  <div key={result.accountId}>
                    <CircleDollarSign size={18} />
                    <span>{account?.investorName ?? result.accountId}</span>
                    <strong>{formatMoney(result.allocated.amount)}</strong>
                    <StatusBadge status={result.status} />
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </section>
      <aside className="trading-ticket">
        <OrderTicket
          accountIds={[...selected]}
          totalEquity={equity}
          marketType={marketType ?? "spot"}
          mixedMarkets={marketTypes.size > 1}
          loading={order.status === "loading"}
          symbol={symbol}
          marketPrice={quote.data?.price ?? null}
          quoteLive={quote.status === "success"}
          onSymbolChange={setSymbol}
          onSubmit={submit}
        />
        {order.error && <p className="form-error">{order.error.message}</p>}
        {lifecycle.error && <p className="form-error">{lifecycle.error.message}</p>}
      </aside>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
