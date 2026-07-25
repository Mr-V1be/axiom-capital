import type {
  AccountDetailsDto,
  InvestorAccountDto,
} from "@axiom/contracts";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useDataGateway } from "../../shared/data/gateway-context";
import { formatDate, formatTime } from "../../shared/format/formatters";
import { useQuery } from "../../shared/hooks/use-async";
import { Button } from "../../shared/ui/Button";
import { Modal } from "../../shared/ui/Modal";

interface Props {
  account: InvestorAccountDto;
  onClose(): void;
}

const capabilityLabels: Array<
  [keyof AccountDetailsDto["capabilities"], string]
> = [
  ["spotAccountRead", "Spot · данные счёта"],
  ["spotOrderRead", "Spot · чтение ордеров"],
  ["spotOrderWrite", "Spot · создание ордеров"],
  ["depositRead", "Чтение депозитов"],
  ["transferRead", "Чтение переводов"],
  ["withdrawRead", "Чтение данных вывода"],
  ["transferWrite", "Создание переводов"],
  ["withdrawWrite", "Создание вывода"],
  ["futuresAccountRead", "Futures · данные счёта"],
  ["futuresOrderRead", "Futures · чтение ордеров"],
  ["futuresOrderWrite", "Futures · торговля"],
];

const kycLabels: Record<AccountDetailsDto["kyc"]["level"], string> = {
  unverified: "Не пройден",
  primary: "Primary",
  advanced: "Advanced",
  institutional: "Institutional",
  unknown: "Неизвестно",
};

const marketLabels = { spot: "Spot", swap: "USDT-M Futures" };
const scopeLabels = {
  standalone: "Отдельный аккаунт",
  subaccount: "MEXC subaccount",
};

type CapabilityStateValue =
  AccountDetailsDto["capabilities"]["spotAccountRead"]["state"];

function Capability({
  state,
  code,
}: {
  state: CapabilityStateValue;
  code?: string;
}) {
  const content = {
    available: { icon: CheckCircle2, label: "Доступно" },
    unavailable: { icon: XCircle, label: "Недоступно" },
    unknown: { icon: CircleHelp, label: "Не проверялось" },
  }[state];
  const Icon = content.icon;

  return (
    <span className={`capability capability--${state}`}>
      <Icon size={14} />
      {content.label}
      {code && <small>{code}</small>}
    </span>
  );
}

function flag(value: boolean | null): string {
  return value === null ? "Неизвестно" : value ? "Да" : "Нет";
}

function amount(value: string): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 8,
  }).format(Number(value));
}

export function AccountDetailsModal({ account, onClose }: Props) {
  const gateway = useDataGateway();
  const query = useQuery(
    (signal) => gateway.getAccountDetails(account.id, signal),
    [gateway, account.id],
  );
  const details = query.data;

  return (
    <Modal
      open
      className="modal--account-details"
      title={`${account.investorName} · ${account.label}`}
      description="Актуальная безопасная диагностика подключения MEXC"
      onClose={onClose}
      footer={
        <>
          <Button onClick={() => void query.refresh()}>
            <RefreshCw size={15} />
            Обновить
          </Button>
          <Button variant="primary" onClick={onClose}>Закрыть</Button>
        </>
      }
    >
      {query.status === "loading" && !details && (
        <div className="account-details-state">
          <RefreshCw className="spin" size={20} />
          Проверяем разрешения MEXC
        </div>
      )}
      {query.error && !details && (
        <div className="account-details-error">
          <AlertTriangle size={18} />
          <div>
            <strong>Не удалось получить данные MEXC</strong>
            <span>{query.error.message}</span>
          </div>
        </div>
      )}
      {details && <DetailsContent details={details} />}
    </Modal>
  );
}

function DetailsContent({ details }: { details: AccountDetailsDto }) {
  const { account, profile } = details;
  return (
    <div className="account-details">
      {profile.canWithdraw === true && (
        <div className="account-details-warning">
          <AlertTriangle size={18} />
          MEXC сообщает, что аккаунт может выводить средства. Право API на
          создание вывода не проверяется опасным запросом.
        </div>
      )}

      <section className="account-details-section">
        <h3>Подключение</h3>
        <dl className="details-grid">
          <Info label="Биржа" value="MEXC" />
          <Info label="Рынок" value={marketLabels[account.marketType]} />
          <Info label="Тип" value={scopeLabels[account.accountScope]} />
          <Info
            label="Режим Axiom"
            value={account.accessMode === "trade" ? "Торговля" : "Только чтение"}
          />
          <Info label="Статус" value={account.status} />
          <Info label="Создан" value={formatDate(account.createdAt)} />
          <Info
            label="Последняя синхронизация"
            value={account.lastSyncedAt
              ? `${formatDate(account.lastSyncedAt)}, ${formatTime(account.lastSyncedAt)}`
              : "Нет"}
          />
          <Info
            label="Проверено"
            value={`${formatDate(details.checkedAt)}, ${formatTime(details.checkedAt)}`}
          />
        </dl>
      </section>

      <section className="account-details-section">
        <h3>Профиль MEXC</h3>
        <dl className="details-grid">
          <Info label="Тип аккаунта" value={profile.accountType ?? "Неизвестно"} />
          <Info label="KYC" value={kycLabels[details.kyc.level]} />
          <Info label="Can trade" value={flag(profile.canTrade)} />
          <Info label="Can deposit" value={flag(profile.canDeposit)} />
          <Info label="Can withdraw" value={flag(profile.canWithdraw)} />
          <Info
            label="Профиль разрешений"
            value={profile.permissions.join(", ") || "Не указан"}
          />
        </dl>
      </section>

      <section className="account-details-section">
        <h3>Возможности API</h3>
        <div className="capability-grid">
          {capabilityLabels.map(([key, label]) => (
            <div key={key}>
              <span>{label}</span>
              <Capability {...details.capabilities[key]} />
            </div>
          ))}
        </div>
        <p className="details-note">
          «Не проверялось» означает, что проверка потребовала бы реального
          перевода или вывода средств.
        </p>
      </section>

      <section className="account-details-section">
        <h3>Ненулевые Spot-балансы</h3>
        {details.balances.length === 0 ? (
          <p className="details-empty">Ненулевых активов нет</p>
        ) : (
          <div className="asset-table">
            {details.balances.map((balance) => (
              <div key={balance.asset}>
                <strong>{balance.asset}</strong>
                <span>Доступно {amount(balance.free)}</span>
                <span>Заблокировано {amount(balance.locked)}</span>
                <b>{amount(balance.total)}</b>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="account-details-section">
        <details className="symbols-details">
          <summary>Разрешённые пары · {details.allowedSymbols.length}</summary>
          <div>
            {details.allowedSymbols.map((symbol) => (
              <span key={symbol}>{symbol}</span>
            ))}
          </div>
        </details>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
