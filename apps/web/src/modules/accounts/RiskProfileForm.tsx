import type { RiskProfileDto } from "@axiom/contracts";
import { ShieldAlert } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "../../shared/ui/Button";

interface Props {
  profile: RiskProfileDto | null;
  loading: boolean;
  saving: boolean;
  error: Error | null;
  onSave(maxAllocationPercent: number): Promise<void>;
}

export function RiskProfileForm({
  profile,
  loading,
  saving,
  error,
  onSave,
}: Props) {
  const [value, setValue] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (profile) setValue(String(profile.maxAllocationPercent));
  }, [profile]);

  const percent = Number(value);
  const valid = Number.isFinite(percent) && percent >= 1 && percent <= 100;
  const changed = profile !== null && percent !== profile.maxAllocationPercent;
  const increase = profile !== null && percent > profile.maxAllocationPercent;
  const canSave = valid && changed && (!increase || confirmed);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    await onSave(percent);
    setConfirmed(false);
  };

  return (
    <form className="risk-profile" onSubmit={submit}>
      <div className="risk-profile__heading">
        <div>
          <span className="eyebrow">Риск-профиль</span>
          <h3>Максимальная маржа на сделку</h3>
        </div>
        {profile && (
          <strong className="risk-profile__current">
            {profile.maxAllocationPercent}%
          </strong>
        )}
      </div>
      <p>
        Лимит применяется сервером отдельно к каждому выбранному счёту и
        используется в pre-trade проверке терминала.
      </p>
      <div className="risk-profile__controls">
        <label className="field">
          <span>Доля капитала счёта</span>
          <div className="input-suffix">
            <input
              type="number"
              min={1}
              max={100}
              step={0.1}
              value={value}
              disabled={!profile || loading || saving}
              onChange={(event) => {
                setValue(event.target.value);
                setConfirmed(false);
              }}
            />
            <span>%</span>
          </div>
        </label>
        <Button
          variant="primary"
          loading={saving}
          disabled={!canSave}
        >
          Сохранить лимит
        </Button>
      </div>
      {increase && (
        <label className="risk-profile__confirmation">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <ShieldAlert size={16} />
          <span>Подтверждаю увеличение риска реальной торговли</span>
        </label>
      )}
      {!valid && value && (
        <p className="form-error">Допустимое значение — от 1% до 100%</p>
      )}
      {error && <p className="form-error">{error.message}</p>}
    </form>
  );
}
