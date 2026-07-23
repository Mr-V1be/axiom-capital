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

const initial: ConnectAccountInput = {
  label: "",
  investorName: "",
  exchange: "mexc",
  apiKey: "",
  secret: "",
};

export function ConnectAccountModal({
  open,
  loading,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<ConnectAccountInput>(initial);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit(form);
    setForm(initial);
  };

  const field = (key: keyof ConnectAccountInput) => ({
    value: form[key],
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
              Чтение и spot-торговля включены. Вывод и внутренние переводы
              выключены. Ключ необходимо ограничить IP-адресом сервера.
            </p>
          </div>
        </div>
        {error && <p className="form-error">{error.message}</p>}
      </form>
    </Modal>
  );
}
