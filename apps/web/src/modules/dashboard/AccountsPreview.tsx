import type { InvestorAccountDto } from "@axiom/contracts";
import { ArrowUpRight } from "lucide-react";
import { formatMoney } from "../../shared/format/formatters";
import { StatusBadge } from "../../shared/ui/StatusBadge";
import { routerStore } from "../../app/router-store";

export function AccountsPreview({
  accounts,
}: {
  accounts: readonly InvestorAccountDto[];
}) {
  return (
    <section className="panel account-preview">
      <header className="panel__header">
        <div>
          <span className="eyebrow">Счета</span>
          <h2>Инвесторы</h2>
        </div>
        <button className="text-button" onClick={() => routerStore.navigate("accounts")}>
          Все счета
          <ArrowUpRight size={15} />
        </button>
      </header>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Инвестор</th>
              <th>Статус</th>
              <th>Капитал</th>
              <th>Сегодня</th>
            </tr>
          </thead>
          <tbody>
            {accounts.slice(0, 4).map((account) => {
              const pnl = Number(account.pnlToday.amount);
              return (
                <tr key={account.id}>
                  <td>
                    <div className="person-cell">
                      <span className="avatar avatar--small">
                        {account.investorName.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <strong>{account.investorName}</strong>
                        <span>{account.label}</span>
                      </div>
                    </div>
                  </td>
                  <td><StatusBadge status={account.status} /></td>
                  <td className="numeric">
                    <strong>{formatMoney(account.equity.amount)}</strong>
                  </td>
                  <td className={`numeric ${pnl >= 0 ? "positive" : "negative"}`}>
                    {formatMoney(account.pnlToday.amount, "USDT", { sign: true })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
