import {
  Activity,
  ArrowUpRight,
  CircleDollarSign,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useDataGateway } from "../../shared/data/gateway-context";
import { formatMoney, formatPercent, formatTime } from "../../shared/format/formatters";
import { useQuery } from "../../shared/hooks/use-async";
import { ErrorState, LoadingState } from "../../shared/ui/DataState";
import { MetricCard } from "../../shared/ui/MetricCard";
import { routerStore } from "../../app/router-store";
import { AccountsPreview } from "./AccountsPreview";
import { EquityChart } from "./EquityChart";

export default function DashboardPage() {
  const gateway = useDataGateway();
  const overview = useQuery(
    (signal) => gateway.getPortfolioOverview(signal),
    [gateway],
  );
  const accounts = useQuery((signal) => gateway.listAccounts(signal), [gateway]);

  if (
    (overview.status === "loading" && !overview.data) ||
    (accounts.status === "loading" && !accounts.data)
  ) {
    return <LoadingState label="Собираем портфель по всем счетам" />;
  }
  if (overview.error) return <ErrorState error={overview.error} retry={overview.refresh} />;
  if (accounts.error) return <ErrorState error={accounts.error} retry={accounts.refresh} />;
  if (!overview.data || !accounts.data) return null;

  const data = overview.data;
  const todayPercent =
    (Number(data.pnlToday.amount) /
      Math.max(1, Number(data.totalEquity.amount) - Number(data.pnlToday.amount))) *
    100;

  return (
    <div className="dashboard page-stack">
      <section className="hero-summary">
        <div>
          <span className="eyebrow">Активы под управлением</span>
          <div className="hero-summary__value">
            {formatMoney(data.totalEquity.amount)}
            <span>USDT</span>
          </div>
          <div className="hero-summary__meta">
            <span className="positive">
              <TrendingUp size={15} />
              {formatMoney(data.pnlToday.amount, "USDT", { sign: true })} сегодня
            </span>
            <span>Обновлено в {formatTime(data.updatedAt)}</span>
          </div>
        </div>
        <button
          className="hero-summary__action"
          onClick={() => routerStore.navigate("settlements")}
        >
          <span className="hero-summary__action-icon">
            <CircleDollarSign size={21} />
          </span>
          <span>
            <small>Готово к распределению</small>
            <strong>$1 036,53</strong>
          </span>
          <ArrowUpRight size={18} />
        </button>
      </section>

      <section className="metrics-grid">
        <MetricCard
          label="Доход сегодня"
          value={formatMoney(data.pnlToday.amount)}
          caption={`${formatPercent(todayPercent, true)} к началу дня`}
          icon={Activity}
          tone="positive"
        />
        <MetricCard
          label="Доход за месяц"
          value={formatMoney(data.pnlMonth.amount)}
          caption="+8,14% доходность"
          icon={TrendingUp}
          tone="positive"
        />
        <MetricCard
          label="Активные счета"
          value={String(data.activeAccounts)}
          caption={`${data.connectedAccounts} синхронизированы`}
          icon={UsersRound}
        />
        <MetricCard
          label="Макс. просадка"
          value={formatPercent(data.maxDrawdownPercent)}
          caption="Лимит стратегии: 8%"
          icon={ShieldCheck}
        />
      </section>

      <section className="panel chart-panel">
        <header className="panel__header">
          <div>
            <span className="eyebrow">Динамика</span>
            <h2>Капитал портфеля</h2>
          </div>
          <div className="range-switcher" aria-label="Период графика">
            <button>7Д</button>
            <button className="active">30Д</button>
            <button>90Д</button>
            <button>Всё</button>
          </div>
        </header>
        <EquityChart points={data.equityCurve} />
      </section>

      <AccountsPreview accounts={accounts.data.items} />
    </div>
  );
}
