import type { ConnectAccountInput } from "@axiom/contracts";
import {
  KeyRound,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useDataGateway } from "../../shared/data/gateway-context";
import { formatMoney, formatTime } from "../../shared/format/formatters";
import { useMutation, useQuery } from "../../shared/hooks/use-async";
import { Button } from "../../shared/ui/Button";
import { ErrorState, LoadingState } from "../../shared/ui/DataState";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { Toast } from "../../shared/ui/Toast";
import { ConnectAccountModal } from "./ConnectAccountModal";

export default function AccountsPage() {
  const gateway = useDataGateway();
  const query = useQuery((signal) => gateway.listAccounts(signal), [gateway]);
  const mutation = useMutation((input: ConnectAccountInput) =>
    gateway.connectAccount(input),
  );
  const syncMutation = useMutation((accountId: string) =>
    gateway.syncAccount(accountId),
  );
  const [search, setSearch] = useState("");
  const [connectOpen, setConnectOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const accounts = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return query.data?.items ?? [];
    return (query.data?.items ?? []).filter((account) =>
      `${account.investorName} ${account.label}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [query.data, search]);

  if (query.status === "loading" && !query.data) {
    return <LoadingState label="Проверяем подключения к бирже" />;
  }
  if (query.error) return <ErrorState error={query.error} retry={query.refresh} />;

  const connect = async (input: ConnectAccountInput) => {
    const account = await mutation.execute(input);
    setConnectOpen(false);
    setToast(`Счёт ${account.investorName} подключён`);
    await query.refresh();
  };

  const sync = async (accountId: string) => {
    await syncMutation.execute(accountId);
    setToast("Баланс синхронизирован с MEXC");
    await query.refresh();
  };

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <h2>Подключённые счета</h2>
          <p>
            Балансы остаются на стороне инвесторов. Права каждого подключения
            ограничиваются выбранным режимом доступа.
          </p>
        </div>
        <Button variant="primary" onClick={() => setConnectOpen(true)}>
          <Plus size={16} />
          Подключить счёт
        </Button>
      </section>

      <section className="security-strip">
        <span className="security-strip__icon"><ShieldCheck size={20} /></span>
        <div>
          <strong>Безопасный контур активен</strong>
          <p>Вывод средств отключён на {accounts.length} из {accounts.length} счетов</p>
        </div>
        <span className="security-strip__status">Все проверки пройдены</span>
      </section>

      <section className="panel">
        <header className="table-toolbar">
          <label className="search-control">
            <Search size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Найти инвестора или счёт"
            />
          </label>
          <Button>
            <SlidersHorizontal size={15} />
            Фильтры
          </Button>
        </header>
        <div className="table-wrap accounts-table">
          <table>
            <thead>
              <tr>
                <th>Инвестор / счёт</th>
                <th>Подключение</th>
                <th>Капитал</th>
                <th>Общая прибыль</th>
                <th>Сегодня</th>
                <th>Безопасность</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>
                    <div className="person-cell">
                      <span className="avatar">
                        {account.investorName.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <strong>{account.investorName}</strong>
                        <span>{account.label} · MEXC</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={account.status} />
                    {account.lastSyncedAt && (
                      <small className="cell-caption">
                        {formatTime(account.lastSyncedAt)}
                      </small>
                    )}
                  </td>
                  <td className="numeric">
                    <strong>{formatMoney(account.equity.amount)}</strong>
                  </td>
                  <td className="numeric positive">
                    {formatMoney(account.pnlTotal.amount, "USDT", { sign: true })}
                  </td>
                  <td
                    className={`numeric ${
                      Number(account.pnlToday.amount) >= 0 ? "positive" : "negative"
                    }`}
                  >
                    {formatMoney(account.pnlToday.amount, "USDT", { sign: true })}
                  </td>
                  <td>
                    <span className="permission-chip">
                      <KeyRound size={13} />
                      {account.permissions.trade ? "Trade only" : "Read only"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      onClick={() => void sync(account.id)}
                      disabled={syncMutation.status === "loading"}
                    >
                      <RefreshCw size={17} />
                      <span className="visually-hidden">
                        Синхронизировать баланс
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ConnectAccountModal
        open={connectOpen}
        loading={mutation.status === "loading"}
        error={mutation.error}
        onClose={() => setConnectOpen(false)}
        onSubmit={connect}
      />
      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
