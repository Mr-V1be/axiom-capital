import type { ConnectAccountInput } from "@axiom/contracts";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "../../shared/ui/Button";
import { Modal } from "../../shared/ui/Modal";

interface Props {
  open: boolean;
  loading: boolean;
  error: Error | null;
  onClose(): void;
  onSubmit(input: ConnectAccountInput): Promise<void>;
}

type AccountDraft = Omit<ConnectAccountInput, "withdrawDisabledConfirmed"> & {
  withdrawDisabledConfirmed: boolean;
};

const initial: AccountDraft = {
  label: "",
  investorName: "",
  exchange: "mexc",
  accountScope: "subaccount",
  marketType: "spot",
  accessMode: "read_only",
  externalAccountId: "",
  apiKey: "",
  secret: "",
  withdrawDisabledConfirmed: false,
};

export function ConnectAccountModal({
  open,
  loading,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<AccountDraft>(initial);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.withdrawDisabledConfirmed) return;
    await onSubmit({ ...form, withdrawDisabledConfirmed: true });
    setForm(initial);
  };

  const field = (
    key: "label" | "investorName" | "externalAccountId" | "apiKey" | "secret",
  ) => ({
    value: form[key] ?? "",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value })),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Подключить счёт MEXC"
      description="Ключ проверяется до сохранения. Право вывода должно быть отключено."
      footer={
        <>
          <Button onClick={onClose}>Отмена</Button>
          <Button
            variant="primary"
            type="submit"
            form="connect-account-form"
            loading={loading}
          >
            <KeyRound size={16} />
            Проверить и подключить
          </Button>
        </>
      }
    >
      <form id="connect-account-form" className="form-stack" onSubmit={submit}>
        <div className="form-grid">
          <label className="field">
            <span>Имя инвестора</span>
            <input
              required
              minLength={2}
              placeholder="Например, Vladislav"
              {...field("investorName")}
            />
          </label>
          <label className="field">
            <span>Название счёта</span>
            <input
              required
              minLength={2}
              placeholder="Main account"
              {...field("label")}
            />
          </label>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Режим доступа</span>
            <select
              value={form.accessMode}
              onChange={(event) => setForm((current) => ({
                ...current,
                accessMode: event.target.value as "read_only" | "trade",
              }))}
            >
              <option value="read_only">Только чтение</option>
              <option value="trade">Чтение и торговля</option>
            </select>
          </label>
          <label className="field">
            <span>Тип подключения</span>
            <select
              value={form.accountScope}
              onChange={(event) => setForm((current) => ({
                ...current,
                accountScope: event.target.value as "standalone" | "subaccount",
              }))}
            >
              <option value="subaccount">MEXC subaccount</option>
              <option value="standalone">Отдельный аккаунт</option>
            </select>
          </label>
          <label className="field">
            <span>Рынок</span>
            <select
              value={form.marketType}
              onChange={(event) => setForm((current) => ({
                ...current,
                marketType: event.target.value as "spot" | "swap",
              }))}
            >
              <option value="swap">USDT-M Futures</option>
              <option value="spot">Spot</option>
            </select>
          </label>
        </div>
        {form.accountScope === "subaccount" && (
          <label className="field">
            <span>UID / имя субаккаунта</span>
            <input required placeholder="MEXC subaccount identifier" {...field("externalAccountId")} />
          </label>
        )}
        <label className="field">
          <span>API Key</span>
          <div className="field__control">
            <KeyRound size={16} />
            <input
              required
              minLength={16}
              autoComplete="off"
              spellCheck={false}
              placeholder="mx0..."
              {...field("apiKey")}
            />
          </div>
        </label>
        <label className="field">
          <span>Secret Key</span>
          <div className="field__control">
            <LockKeyhole size={16} />
            <input
              required
              minLength={16}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••••••••"
              {...field("secret")}
            />
          </div>
        </label>
        <div className="security-note">
          <ShieldCheck size={19} />
          <div>
            <strong>Обязательные разрешения</strong>
            <p>
              {form.accessMode === "read_only"
                ? "Включите только чтение счёта."
                : "Включите чтение счёта и торговлю."} Вывод и внутренние
              переводы должны быть выключены. Ограничьте ключ IP-адресом
              сервера.
            </p>
          </div>
        </div>
        <label className="checkbox-line">
          <input
            type="checkbox"
            required
            checked={form.withdrawDisabledConfirmed}
            onChange={(event) => setForm((current) => ({
              ...current,
              withdrawDisabledConfirmed: event.target.checked,
            }))}
          />
          <span>Подтверждаю: у API-ключа отключён вывод средств</span>
        </label>
        {error && <p className="form-error">{error.message}</p>}
      </form>
    </Modal>
  );
}
