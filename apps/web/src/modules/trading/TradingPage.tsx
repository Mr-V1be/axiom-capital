import type { PlaceBatchOrderInput } from "@axiom/contracts";
import { Check, CircleDollarSign, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDataGateway } from "../../shared/data/gateway-context";
import { formatMoney } from "../../shared/format/formatters";
import { useMutation, useQuery } from "../../shared/hooks/use-async";
import { ErrorState, LoadingState } from "../../shared/ui/DataState";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { Toast } from "../../shared/ui/Toast";
import { OrderTicket } from "./OrderTicket";

export default function TradingPage() {
  const gateway = useDataGateway();
  const accounts = useQuery((signal) => gateway.listAccounts(signal), [gateway]);
  const order = useMutation((input: PlaceBatchOrderInput) =>
    gateway.placeBatchOrder(input),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (accounts.data && selected.size === 0) {
      setSelected(
        new Set(
          accounts.data.items
            .filter((account) => account.status === "connected")
            .map((account) => account.id),
        ),
      );
    }
  }, [accounts.data, selected.size]);

  const selectedAccounts = useMemo(
    () => (accounts.data?.items ?? []).filter((item) => selected.has(item.id)),
    [accounts.data, selected],
  );
  const equity = selectedAccounts.reduce(
    (sum, account) => sum + Number(account.equity.amount),
    0,
  );

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
    const accepted = result.results.filter((item) => item.status === "accepted").length;
    setToast(`Ордер принят на ${accepted} из ${result.results.length} счетов`);
  };

  return (
    <div className="trading-layout">
      <section className="trading-main page-stack">
        <div className="market-strip">
          <div className="market-pair">
            <span className="asset-icon">₿</span>
            <div><strong>BTC / USDT</strong><span>Bitcoin</span></div>
          </div>
          <div><span>Цена</span><strong>$118 420,10</strong></div>
          <div><span>24ч</span><strong className="positive">+2,84%</strong></div>
          <div><span>Объём 24ч</span><strong>$2,41B</strong></div>
          <button className="icon-button">
            <RefreshCw size={16} />
            <span className="visually-hidden">Обновить котировку</span>
          </button>
        </div>

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
              const disabled = account.status !== "connected";
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
                    <small>{account.label}</small>
                  </span>
                  <strong>{formatMoney(account.equity.amount)}</strong>
                  <StatusBadge status={account.status} />
                </button>
              );
            })}
          </div>
        </section>

        {order.data && (
          <section className="panel execution-panel">
            <header className="panel__header">
              <div>
                <span className="eyebrow">Batch {order.data.batchId.slice(-8)}</span>
                <h2>Результат исполнения</h2>
              </div>
              <span className="status-badge status-badge--connected">
                <span className="status-badge__dot" />
                Завершено
              </span>
            </header>
            <div className="execution-grid">
              {order.data.results.map((result) => {
                const account = accounts.data?.items.find(
                  (item) => item.id === result.accountId,
                );
                return (
                  <div key={result.accountId}>
                    <CircleDollarSign size={18} />
                    <span>{account?.investorName ?? result.accountId}</span>
                    <strong>{formatMoney(result.allocated.amount)}</strong>
                    <StatusBadge
                      status={result.status === "accepted" ? "connected" : "degraded"}
                    />
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
          loading={order.status === "loading"}
          onSubmit={submit}
        />
        {order.error && <p className="form-error">{order.error.message}</p>}
      </aside>
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
