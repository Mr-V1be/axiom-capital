import type { ConnectAccountInput } from "@axiom/contracts";

export type AccountDraft = Omit<
  ConnectAccountInput,
  "withdrawDisabledConfirmed"
> & {
  withdrawDisabledConfirmed: boolean;
};

export const initialAccountDraft: AccountDraft = {
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

export function toConnectAccountInput(
  form: AccountDraft,
): ConnectAccountInput {
  const externalAccountId = form.externalAccountId?.trim();

  return {
    label: form.label.trim(),
    investorName: form.investorName.trim(),
    exchange: form.exchange,
    accountScope: form.accountScope,
    marketType: form.marketType,
    accessMode: form.accessMode,
    apiKey: form.apiKey.trim(),
    secret: form.secret.trim(),
    withdrawDisabledConfirmed: true,
    ...(form.accountScope === "subaccount" && externalAccountId
      ? { externalAccountId }
      : {}),
  };
}
