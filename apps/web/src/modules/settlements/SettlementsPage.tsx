import type { CreateSettlementInput } from "@axiom/contracts";
import {
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Plus,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { useDataGateway } from "../../shared/data/gateway-context";
import {
  formatDate,
  formatMoney,
  maskAddress,
} from "../../shared/format/formatters";
import { useMutation, useQuery } from "../../shared/hooks/use-async";
import { Button } from "../../shared/ui/Button";
import { ErrorState, LoadingState } from "../../shared/ui/DataState";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { Toast } from "../../shared/ui/Toast";
import { CreateSettlementModal } from "./CreateSettlementModal";
import { SplitTestnetPanel } from "./SplitTestnetPanel";

export default function SettlementsPage() {
  const gateway = useDataGateway();
  const settlements = useQuery(
    (signal) => gateway.listSettlements(signal),
    [gateway],
  );
  const accounts = useQuery((signal) => gateway.listAccounts(signal), [gateway]);
  const splits = useQuery(
    (signal) => gateway.getSplitOverview(signal),
    [gateway],
  );
  const mutation = useMutation((input: CreateSettlementInput) =>
    gateway.createSettlement(input),
  );
  const provision = useMutation((accountId: string) =>
    gateway.provisionTestSplit(accountId, { traderSharePercent: 20 }),
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (settlements.error) {
    return <ErrorState error={settlements.error} retry={settlements.refresh} />;
  }
  if (accounts.error) {
    return <ErrorState error={accounts.error} retry={accounts.refresh} />;
  }
  if (splits.error) {
    return <ErrorState error={splits.error} retry={splits.refresh} />;
  }
  if (!settlements.data || !accounts.data || !splits.data) {
    return <LoadingState label="Проверяем расчёты и onchain-статусы" />;
  }

  const create = async (input: CreateSettlementInput) => {
    await mutation.execute(input);
    setModalOpen(false);
    setToast("Распределение рассчитано");
    await settlements.refresh();
  };
  const items = settlements.data?.items ?? [];
  const provisionSplit = async (accountId: string) => {
    await provision.execute(accountId);
    await splits.refresh();
    setToast("Тестовый Split создан и проверен on-chain");
  };
  const awaiting = items
    .filter((item) => item.status === "awaiting_investor")
    .reduce((sum, item) => sum + Number(item.grossProfit.amount), 0);
  const traderTotal = items.reduce(
    (sum, item) => sum + Number(item.traderShare.amount),
    0,
  );

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <h2>Деление прибыли</h2>
          <p>
            Каждый инвестор получает отдельный неизменяемый Split. Деньги
            распределяются только после подтверждённого вывода с биржи.
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Новый расчёт
        </Button>
      </section>

      <section className="settlement-summary">
        <div className="settlement-summary__primary">
          <span className="eyebrow">Ожидает перевода</span>
          <strong>{formatMoney(awaiting)}</strong>
          <p>Инвестор подтверждает вывод на адрес Split</p>
        </div>
        <div>
          <span>Вознаграждение управляющего</span>
          <strong>{formatMoney(traderTotal)}</strong>
          <small>За текущий расчётный период</small>
        </div>
        <div>
          <span>Активных Split</span>
          <strong>{splits.data.items.length}</strong>
          <small>Immutable · {splits.data.network.networkName}</small>
        </div>
      </section>

      <SplitTestnetPanel
        accounts={accounts.data?.items ?? []}
        overview={splits.data}
        loading={provision.status === "loading"}
        error={provision.error}
        onProvision={provisionSplit}
      />

      <section className="settlement-flow panel">
        <div>
          <span className="flow-step flow-step--done"><CheckCircle2 size={17} /></span>
          <p><strong>Расчёт</strong><span>High-water mark</span></p>
        </div>
        <ArrowRight size={17} />
        <div>
          <span className="flow-step flow-step--active">2</span>
          <p><strong>Перевод</strong><span>Подтверждает инвестор</span></p>
        </div>
        <ArrowRight size={17} />
        <div>
          <span className="flow-step">3</span>
          <p><strong>Split</strong><span>Onchain-распределение</span></p>
        </div>
        <ArrowRight size={17} />
        <div>
          <span className="flow-step">4</span>
          <p><strong>Получение</strong><span>Каждый забирает долю</span></p>
        </div>
      </section>

      <section className="panel">
        <header className="panel__header">
          <div>
            <span className="eyebrow">История</span>
            <h2>Расчётные периоды</h2>
          </div>
          <span className="panel__count">{items.length} записей</span>
        </header>
        <div className="settlement-list">
          {items.map((item) => (
            <article key={item.id} className="settlement-row">
              <div className="settlement-row__person">
                <span className="avatar">
                  {item.investorName.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <strong>{item.investorName}</strong>
                  <span>{formatDate(item.periodStart)} — {formatDate(item.periodEnd)}</span>
                </div>
              </div>
              <div>
                <span>Чистая прибыль</span>
                <strong className="positive">{formatMoney(item.grossProfit.amount)}</strong>
              </div>
              <div>
                <span>Инвестор</span>
                <strong>{formatMoney(item.investorShare.amount)}</strong>
              </div>
              <div>
                <span>Управляющий · {item.traderSharePercent}%</span>
                <strong>{formatMoney(item.traderShare.amount)}</strong>
              </div>
              <div>
                <span>Split</span>
                {item.splitAddress ? (
                  <button
                    className="address-button"
                    onClick={() => {
                      void navigator.clipboard.writeText(item.splitAddress!);
                      setToast("Адрес Split скопирован");
                    }}
                  >
                    {maskAddress(item.splitAddress)} <Copy size={13} />
                  </button>
                ) : (
                  <span className="muted">Не настроен</span>
                )}
              </div>
              <div className="settlement-row__status">
                <StatusBadge status={item.status} />
                {item.status === "distributed" && (
                  <button className="icon-button">
                    <ExternalLink size={15} />
                    <span className="visually-hidden">Открыть транзакцию</span>
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {!items.length && (
          <div className="empty-list">
            <WalletCards size={28} />
            <strong>Расчётов пока нет</strong>
            <p>Создайте первый расчёт после прибыльного периода.</p>
          </div>
        )}
      </section>

      <CreateSettlementModal
        open={modalOpen}
        accounts={accounts.data?.items ?? []}
        splitConfigurations={splits.data.items}
        loading={mutation.status === "loading"}
        error={mutation.error}
        onClose={() => setModalOpen(false)}
        onSubmit={create}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
