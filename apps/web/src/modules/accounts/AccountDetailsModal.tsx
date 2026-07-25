import type { InvestorAccountDto } from "@axiom/contracts";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { useDataGateway } from "../../shared/data/gateway-context";
import { useMutation, useQuery } from "../../shared/hooks/use-async";
import { Button } from "../../shared/ui/Button";
import { Modal } from "../../shared/ui/Modal";
import { AccountDetailsContent } from "./AccountDetailsContent";

interface Props {
  account: InvestorAccountDto;
  onUpdated(): Promise<void>;
  onClose(): void;
}

export function AccountDetailsModal({ account, onUpdated, onClose }: Props) {
  const gateway = useDataGateway();
  const query = useQuery(
    (signal) => gateway.getAccountDetails(account.id, signal),
    [gateway, account.id],
  );
  const access = useMutation((accessMode: "read_only" | "trade") =>
    gateway.updateAccountAccess(account.id, accessMode)
  );
  const details = query.data;
  const tradeCapability = details?.capabilities[
    account.marketType === "spot" ? "spotOrderWrite" : "futuresOrderWrite"
  ];
  const enableTrading = async () => {
    await access.execute("trade");
    await Promise.all([query.refresh(), onUpdated()]);
  };

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
          {details?.account.accessMode === "read_only" &&
            tradeCapability?.state === "available" && (
            <Button
              variant="primary"
              loading={access.status === "loading"}
              onClick={() => void enableTrading()}
            >
              <ShieldCheck size={15} />
              Включить торговлю
            </Button>
          )}
          <Button onClick={onClose}>Закрыть</Button>
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
      {access.error && <p className="form-error">{access.error.message}</p>}
      {details && <AccountDetailsContent details={details} />}
    </Modal>
  );
}
