import type { CreateSettlementInput, InvestorAccountDto } from "@axiom/contracts";
import { Calculator, ShieldCheck } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { formatMoney } from "../../shared/format/formatters";
import { Button } from "../../shared/ui/Button";
import { Modal } from "../../shared/ui/Modal";

interface Props {
  open: boolean;
  accounts: readonly InvestorAccountDto[];
  loading: boolean;
  error: Error | null;
  onClose(): void;
  onSubmit(input: CreateSettlementInput): Promise<void>;
}

export function CreateSettlementModal({
  open,
  accounts,
  loading,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [share, setShare] = useState(20);
  const account = useMemo(
    () => accounts.find((item) => item.id === accountId) ?? accounts[0],
    [accounts, accountId],
  );
  const profit = Math.max(0, Number(account?.pnlTotal.amount ?? 0));
  const trader = profit * (share / 100);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!account) return;
    await onSubmit({
      accountId: account.id,
      periodEnd: new Date().toISOString(),
      traderSharePercent: share,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Рассчитать распределение"
      description="Комиссия считается только с прибыли выше предыдущего high-water mark."
      footer={
        <>
          <Button onClick={onClose}>Отмена</Button>
          <Button
            variant="primary"
            form="settlement-form"
            type="submit"
            loading={loading}
          >
            <Calculator size={16} />
            Создать расчёт
          </Button>
        </>
      }
    >
      <form id="settlement-form" className="form-stack" onSubmit={submit}>
        <label className="field">
          <span>Счёт инвестора</span>
          <select
            value={account?.id ?? ""}
            onChange={(event) => setAccountId(event.target.value)}
          >
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.investorName} · {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Доля управляющего</span>
          <div className="input-suffix">
            <input
              type="number"
              min={0}
              max={50}
              value={share}
              onChange={(event) => setShare(Number(event.target.value))}
            />
            <span>%</span>
          </div>
        </label>
        <div className="split-preview">
          <div>
            <span>Расчётная прибыль</span>
            <strong>{formatMoney(profit)}</strong>
          </div>
          <div className="split-bar">
            <span style={{ width: `${100 - share}%` }} />
            <i style={{ width: `${share}%` }} />
          </div>
          <div className="split-preview__shares">
            <span>Инвестор <strong>{formatMoney(profit - trader)}</strong></span>
            <span>Управляющий <strong>{formatMoney(trader)}</strong></span>
          </div>
        </div>
        <div className="security-note">
          <ShieldCheck size={19} />
          <div>
            <strong>High-water mark защищает инвестора</strong>
            <p>
              Если капитал не превысил прошлый максимум, вознаграждение
              управляющего не начисляется.
            </p>
          </div>
        </div>
        {error && <p className="form-error">{error.message}</p>}
      </form>
    </Modal>
  );
}
