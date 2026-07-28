import type { InvestorAccountDto } from "@axiom/contracts";

export interface AccountFilterState {
  market: "all" | InvestorAccountDto["marketType"];
  access: "all" | InvestorAccountDto["accessMode"];
  status: "all" | InvestorAccountDto["status"];
}

export const emptyAccountFilters: AccountFilterState = {
  market: "all",
  access: "all",
  status: "all",
};

export function matchesAccountFilters(
  account: InvestorAccountDto,
  filters: AccountFilterState,
): boolean {
  return (
    (filters.market === "all" || account.marketType === filters.market) &&
    (filters.access === "all" || account.accessMode === filters.access) &&
    (filters.status === "all" || account.status === filters.status)
  );
}

interface Props {
  value: AccountFilterState;
  onChange(value: AccountFilterState): void;
}

export function AccountFilters({ value, onChange }: Props) {
  const update = <K extends keyof AccountFilterState>(
    key: K,
    next: AccountFilterState[K],
  ) => onChange({ ...value, [key]: next });
  return (
    <div className="account-filters">
      <label>Рынок
        <select value={value.market} onChange={(event) =>
          update("market", event.target.value as AccountFilterState["market"])}>
          <option value="all">Все</option><option value="spot">Spot</option>
          <option value="swap">Futures</option>
        </select>
      </label>
      <label>Доступ
        <select value={value.access} onChange={(event) =>
          update("access", event.target.value as AccountFilterState["access"])}>
          <option value="all">Все</option><option value="trade">Trade</option>
          <option value="read_only">Read only</option>
        </select>
      </label>
      <label>Статус
        <select value={value.status} onChange={(event) =>
          update("status", event.target.value as AccountFilterState["status"])}>
          <option value="all">Все</option><option value="connected">Активен</option>
          <option value="degraded">Требует внимания</option>
          <option value="pending">Проверяется</option>
          <option value="disabled">Отключён</option>
        </select>
      </label>
      <button type="button" onClick={() => onChange(emptyAccountFilters)}>
        Сбросить
      </button>
    </div>
  );
}
