import type {
  ExchangeActivityDto,
} from "@axiom/contracts";
import { AlertTriangle, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";
import { useDataGateway } from "../../shared/data/gateway-context";
import { formatTime } from "../../shared/format/formatters";
import { useMutation } from "../../shared/hooks/use-async";
import { usePollingQuery } from "../../shared/hooks/use-polling-query";

type Tab = "open" | "orders" | "trades";
type ActivityOrder = ExchangeActivityDto["openOrders"][number];

export function ExchangeActivityPanel() {
  const gateway = useDataGateway();
  const activity = usePollingQuery(
    (signal) => gateway.listExchangeActivity(signal),
    [gateway],
    10_000,
  );
  const cancel = useMutation((order: ActivityOrder) =>
    gateway.cancelExchangeOrder(order.id, {
      accountId: order.accountId,
      symbol: order.symbol,
      kind: order.kind,
      idempotencyKey: crypto.randomUUID(),
      confirmed: true,
    })
  );
  const [tab, setTab] = useState<Tab>("open");
  const [confirming, setConfirming] = useState<string | null>(null);
  const data = activity.data;

  const cancelOrder = async (order: ActivityOrder) => {
    const result = await cancel.execute(order);
    if (result.status === "completed") {
      setConfirming(null);
      await activity.refresh();
    }
  };

  return (
    <section className="panel exchange-activity">
      <header className="panel__header">
        <div>
          <span className="eyebrow">MEXC Futures</span>
          <h2>Заявки и исполнения</h2>
        </div>
        <div className="positions-panel__live">
          <span className="live-indicator"><i />Live · 10 сек.</span>
          {data && <small>Обновлено {formatTime(data.updatedAt)}</small>}
          <button
            className="icon-button"
            aria-label="Обновить заявки"
            onClick={() => void activity.refresh()}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>
      <nav className="exchange-activity__tabs" aria-label="История MEXC">
        <TabButton active={tab === "open"} onClick={() => setTab("open")}>
          Активные ({data?.openOrders.length ?? 0})
        </TabButton>
        <TabButton active={tab === "orders"} onClick={() => setTab("orders")}>
          История ордеров
        </TabButton>
        <TabButton active={tab === "trades"} onClick={() => setTab("trades")}>
          Исполнения
        </TabButton>
      </nav>
      {activity.error && !data && (
        <p className="positions-panel__state positions-panel__state--error">
          <AlertTriangle size={17} /> {activity.error.message}
        </p>
      )}
      {data?.failures.length ? (
        <p className="positions-panel__warning">
          <AlertTriangle size={15} />
          Не обновлены: {data.failures.map((item) => item.accountLabel).join(", ")}
        </p>
      ) : null}
      {data && (
        <ActivityTable
          tab={tab}
          data={data}
          confirming={confirming}
          busy={cancel.status === "loading"}
          onAskCancel={setConfirming}
          onCancel={cancelOrder}
        />
      )}
      {!data && !activity.error && (
        <p className="positions-panel__state">
          <span className="spinner" /> Загружаем историю MEXC
        </p>
      )}
      {cancel.error && <p className="form-error">{cancel.error.message}</p>}
      {cancel.data?.status === "failed" && (
        <p className="form-error">{cancel.data.message}</p>
      )}
    </section>
  );
}

function ActivityTable(props: {
  tab: Tab;
  data: ExchangeActivityDto;
  confirming: string | null;
  busy: boolean;
  onAskCancel(id: string | null): void;
  onCancel(order: ActivityOrder): Promise<void>;
}) {
  if (props.tab === "trades") {
    if (!props.data.recentTrades.length) return <Empty />;
    return (
      <div className="positions-table-wrap">
        <table className="positions-table exchange-activity__table">
          <thead><tr>
            <th>Время / счёт</th><th>Контракт</th><th>Сторона</th>
            <th>Цена</th><th>Количество</th><th>Комиссия / PnL</th>
          </tr></thead>
          <tbody>{props.data.recentTrades.map((trade) => (
            <tr key={`${trade.accountId}:${trade.id}`}>
              <td><strong>{dateTime(trade.createdAt)}</strong><small>{trade.accountLabel}</small></td>
              <td><strong>{cleanSymbol(trade.symbol)}</strong></td>
              <td><strong>{side(trade.side)}</strong></td>
              <td><strong>{trade.price}</strong></td>
              <td><strong>{trade.amount}</strong></td>
              <td><strong>{trade.fee ?? "—"} {trade.feeCurrency ?? ""}</strong><small>PnL {trade.realizedPnl ?? "—"}</small></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );
  }
  const orders = props.tab === "open"
    ? props.data.openOrders
    : props.data.recentOrders;
  if (!orders.length) return <Empty />;
  return (
    <div className="positions-table-wrap">
      <table className="positions-table exchange-activity__table">
        <thead><tr>
          <th>Время / счёт</th><th>Контракт</th><th>Сторона / тип</th>
          <th>Цена</th><th>Исполнено</th><th>Статус</th>
          {props.tab === "open" && <th>Действие</th>}
        </tr></thead>
        <tbody>{orders.map((order) => (
          <tr key={`${order.accountId}:${order.id}`}>
            <td><strong>{dateTime(order.createdAt)}</strong><small>{order.accountLabel}</small></td>
            <td>
              <strong>{cleanSymbol(order.symbol)}</strong>
              <small>{order.kind === "trigger"
                ? "Защитная заявка"
                : order.reduceOnly ? "Reduce only" : "Открытие"}</small>
            </td>
            <td><strong>{side(order.side)}</strong><small>{order.type}</small></td>
            <td>
              <strong>{order.triggerPrice
                ? `Триггер ${order.triggerPrice}`
                : order.price ?? "Market"}</strong>
              <small>ср. {order.averagePrice ?? "—"}</small>
            </td>
            <td><strong>{order.filled} / {order.amount}</strong><small>ост. {order.remaining}</small></td>
            <td><strong>{order.status}</strong></td>
            {props.tab === "open" && (
              <td>{props.confirming === order.id ? (
                <span className="exchange-activity__confirm">
                  <button disabled={props.busy} onClick={() => void props.onCancel(order)}>Да, снять</button>
                  <button onClick={() => props.onAskCancel(null)}>Нет</button>
                </span>
              ) : (
                <button className="button button--danger" onClick={() => props.onAskCancel(order.id)}>
                  <XCircle size={13} /> Отменить
                </button>
              )}</td>
            )}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function TabButton(props: React.PropsWithChildren<{
  active: boolean;
  onClick(): void;
}>) {
  return (
    <button className={props.active ? "active" : ""} onClick={props.onClick}>
      {props.children}
    </button>
  );
}

function Empty() {
  return <p className="positions-panel__state">Данных в этом разделе пока нет</p>;
}

const cleanSymbol = (value: string) => value.split(":")[0] ?? value;
const side = (value: "buy" | "sell") => value === "buy" ? "Buy" : "Sell";
const dateTime = (value: string | null) =>
  value ? new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value)) : "—";
