import type {
  InvestorAccountDto,
  SplitOverviewDto,
} from "@axiom/contracts";
import { CheckCircle2, Copy, FlaskConical, Link2 } from "lucide-react";
import { maskAddress } from "../../shared/format/formatters";
import { Button } from "../../shared/ui/Button";

interface Props {
  accounts: readonly InvestorAccountDto[];
  overview: SplitOverviewDto;
  loading: boolean;
  error: Error | null;
  onProvision(accountId: string): Promise<void>;
}

export function SplitTestnetPanel({
  accounts,
  overview,
  loading,
  error,
  onProvision,
}: Props) {
  const network = overview.network;
  const ready = network.connected && network.factoryDeployed;

  return (
    <section className="split-testnet panel">
      <header className="panel__header">
        <div>
          <span className="eyebrow">Splits V2 · тестовый контур</span>
          <h2>{network.networkName ?? "Сеть не подключена"}</h2>
        </div>
        <span className={`split-network ${ready ? "is-ready" : ""}`}>
          <span />
          {ready ? "RPC и Factory доступны" : "Контур недоступен"}
        </span>
      </header>

      <div className="split-testnet__facts">
        <div>
          <FlaskConical size={18} />
          <span>Среда<strong>Изолированный fork</strong></span>
        </div>
        <div>
          <Link2 size={18} />
          <span>Chain ID<strong>{network.chainId ?? "—"}</strong></span>
        </div>
        <div>
          <CheckCircle2 size={18} />
          <span>Контракт<strong>Immutable · Push</strong></span>
        </div>
      </div>

      <div className="split-testnet__accounts">
        {accounts.map((account) => {
          const split = overview.items.find(
            (item) => item.accountId === account.id,
          );
          return (
            <article key={account.id}>
              <div>
                <strong>{account.investorName}</strong>
                <span>{account.label}</span>
              </div>
              {split ? (
                <>
                  <div className="split-testnet__share">
                    <span>Инвестор {100 - split.traderSharePercent}%</span>
                    <span>Управляющий {split.traderSharePercent}%</span>
                  </div>
                  <button
                    className="address-button"
                    onClick={() => void navigator.clipboard.writeText(split.address)}
                  >
                    {maskAddress(split.address)} <Copy size={13} />
                  </button>
                  <span className="split-verified">On-chain проверен</span>
                </>
              ) : (
                <Button
                  variant="primary"
                  loading={loading}
                  disabled={!ready}
                  onClick={() => void onProvision(account.id)}
                >
                  Подключить 80/20
                </Button>
              )}
            </article>
          );
        })}
      </div>
      {error && <p className="form-error">{error.message}</p>}
      <p className="split-testnet__notice">
        Тестовые ETH и адреса не имеют ценности. Контур физически отделён от
        Base Mainnet и не может получить доступ к средствам MEXC.
      </p>
    </section>
  );
}
