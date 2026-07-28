import {
  Activity,
  ArrowUpRight,
  CircleDollarSign,
  ShieldCheck,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { useDataGateway } from "../../shared/data/gateway-context";
import { formatMoney, formatPercent, formatTime } from "../../shared/format/formatters";
import { useQuery } from "../../shared/hooks/use-async";
import { ErrorState, LoadingState } from "../../shared/ui/DataState";
import { MetricCard } from "../../shared/ui/MetricCard";
import { routerStore } from "../../app/router-store";
import { AccountsPreview } from "./AccountsPreview";
import { EquityChart } from "./EquityChart";
import { PositionsPanel } from "../positions/PositionsPanel";

export default function DashboardPage() {
  const gateway = useDataGateway();
  const overview = useQuery(
    (signal) => gateway.getPortfolioOverview(signal),
    [gateway],
  );
  const accounts = useQuery((signal) => gateway.listAccounts(signal), [gateway]);
  const settlements = useQuery(
    (signal) => gateway.listSettlements(signal),
    [gateway],
  );
  const [range, setRange] = useState<7 | 30>(30);

  if (
    (overview.status === "loading" && !overview.data) ||
    (accounts.status === "loading" && !accounts.data) ||
    (settlements.status === "loading" && !settlements.data)
  ) {
    return <LoadingState label="Собираем портфель по всем счетам" />;
  }
  if (overview.error) return <ErrorState error={overview.error} retry={overview.refresh} />;
  if (accounts.error) return <ErrorState error={accounts.error} retry={accounts.refresh} />;
  if (settlements.error) {
    return <ErrorState error={settlements.error} retry={settlements.refresh} />;
  }
  if (!overview.data || !accounts.data || !settlements.data) return null;

  const data = overview.data;
  const todayPercent =
    (Number(data.pnlToday.amount) /
      Math.max(1, Number(data.totalEquity.amount) - Number(data.pnlToday.amount))) *
    100;
  const monthPercent = Number(data.pnlMonth.amount) /
    Math.max(1, Number(data.totalEquity.amount) - Number(data.pnlMonth.amount)) *
    100;
  const distributable = settlements.data.items
    .filter((item) => !["distributed", "cancelled"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.grossProfit.amount), 0);
  const drawdownLimit = Math.min(
    ...accounts.data.items
      .map((item) => item.riskProfile?.maxDailyLossPercent)
      .filter((value): value is number => value !== undefined),
    100,
  );
  const curveSince = Date.now() - range * 86_400_000;
  const curve = data.equityCurve.filter((point) =>
    new Date(point.at).valueOf() >= curveSince
  );

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
            <strong>{formatMoney(distributable)}</strong>
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
          caption={`${formatPercent(monthPercent, true)} к капиталу`}
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
          caption={`Лимит стратегии: ${formatPercent(drawdownLimit)}`}
          icon={ShieldCheck}
        />
      </section>

      <PositionsPanel />

      <section className="panel chart-panel">
        <header className="panel__header">
          <div>
            <span className="eyebrow">Динамика</span>
            <h2>Капитал портфеля</h2>
          </div>
          <div className="range-switcher" aria-label="Период графика">
            <button
              className={range === 7 ? "active" : ""}
              onClick={() => setRange(7)}
            >7Д</button>
            <button
              className={range === 30 ? "active" : ""}
              onClick={() => setRange(30)}
            >30Д</button>
          </div>
        </header>
        <EquityChart points={curve} />
      </section>

      <AccountsPreview accounts={accounts.data.items} />
    </div>
  );
}
