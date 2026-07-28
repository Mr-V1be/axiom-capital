import type { PositionActionInput, PositionDto } from "@axiom/contracts";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useDataGateway } from "../../shared/data/gateway-context";
import { useMutation } from "../../shared/hooks/use-async";
import { Button } from "../../shared/ui/Button";
import { Modal } from "../../shared/ui/Modal";
import { PositionProtectionFields } from "./PositionProtectionFields";

interface Props {
  position: PositionDto | null;
  onClose(): void;
  onCompleted(): Promise<void> | void;
}

type Action = PositionActionInput["action"];

export function PositionActionModal({
  position,
  onClose,
  onCompleted,
}: Props) {
  const gateway = useDataGateway();
  const command = useMutation((input: PositionActionInput) => {
    if (!position) throw new Error("Position is not selected");
    return gateway.managePosition(position.accountId, position.id, input);
  });
  const [action, setAction] = useState<Action>("close");
  const [contracts, setContracts] = useState(position?.contracts ?? "0");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [leverage, setLeverage] = useState(position?.leverage ?? "10");
  const [marginDirection, setMarginDirection] = useState<"add" | "reduce">("add");
  const [marginAmount, setMarginAmount] = useState("1");
  const [protectionType, setProtectionType] =
    useState<"take_profit" | "stop_loss">("stop_loss");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [priceSource, setPriceSource] =
    useState<"last" | "mark" | "index">("mark");
  const [confirmed, setConfirmed] = useState(false);

  if (!position) return null;
  const marginBlocked = action === "adjust_margin" && !position.canAdjustMargin;
  const changeAction = (next: Action) => {
    setAction(next);
    setConfirmed(false);
    command.reset();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const base = {
      idempotencyKey: crypto.randomUUID(),
      confirmed: true as const,
    };
    let input: PositionActionInput;
    if (action === "close") {
      input = {
        ...base,
        action,
        contracts,
        orderType,
        ...(orderType === "limit" ? { limitPrice } : {}),
      };
    } else if (action === "set_leverage") {
      input = { ...base, action, leverage: Number(leverage) };
    } else if (action === "adjust_margin") {
      input = {
        ...base,
        action,
        direction: marginDirection,
        amount: marginAmount,
      };
    } else {
      input = {
        ...base,
        action,
        protectionType,
        triggerPrice,
        contracts,
        priceSource,
      };
    }
    const result = await command.execute(input);
    if (result.status === "completed") await onCompleted();
  };

  return (
    <Modal
      open
      title={`Управление ${cleanSymbol(position.symbol)}`}
      description={`${position.accountLabel} · ${position.side.toUpperCase()} · ${position.contracts} контрактов`}
      onClose={onClose}
      className="modal--position-action"
    >
      <form className="form-stack" onSubmit={(event) => void submit(event)}>
        <label className="field">
          Действие
          <select value={action} onChange={(event) =>
            changeAction(event.target.value as Action)}>
            <option value="close">Закрыть позицию</option>
            <option value="place_protection">Take Profit / Stop Loss</option>
            <option value="set_leverage">Изменить плечо</option>
            <option value="adjust_margin">Изменить маржу</option>
          </select>
        </label>

        {(action === "close" || action === "place_protection") && (
          <label className="field">
            Контракты (доступно {position.contracts})
            <input
              type="number"
              min="0"
              max={position.contracts}
              step="any"
              required
              value={contracts}
              onChange={(event) => setContracts(event.target.value)}
            />
          </label>
        )}

        {action === "close" && (
          <div className="form-grid">
            <label className="field">
              Тип заявки
              <select value={orderType} onChange={(event) =>
                setOrderType(event.target.value as "market" | "limit")}>
                <option value="market">Market</option>
                <option value="limit">Limit</option>
              </select>
            </label>
            {orderType === "limit" && (
              <label className="field">
                Лимитная цена
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={limitPrice}
                  onChange={(event) => setLimitPrice(event.target.value)}
                />
              </label>
            )}
          </div>
        )}

        {action === "place_protection" && (
          <PositionProtectionFields
            type={protectionType}
            triggerPrice={triggerPrice}
            priceSource={priceSource}
            onType={setProtectionType}
            onTrigger={setTriggerPrice}
            onSource={setPriceSource}
          />
        )}

        {action === "set_leverage" && (
          <label className="field">
            Новое плечо
            <input
              type="number"
              min="1"
              max="200"
              required
              value={leverage}
              onChange={(event) => setLeverage(event.target.value)}
            />
          </label>
        )}

        {action === "adjust_margin" && (
          <div className="form-grid">
            <label className="field">
              Операция
              <select value={marginDirection} onChange={(event) =>
                setMarginDirection(event.target.value as "add" | "reduce")}>
                <option value="add">Добавить</option>
                <option value="reduce">Уменьшить</option>
              </select>
            </label>
            <label className="field">
              Сумма, USDT
              <input
                type="number"
                min="0"
                step="any"
                required
                value={marginAmount}
                onChange={(event) => setMarginAmount(event.target.value)}
              />
            </label>
          </div>
        )}

        {marginBlocked && (
          <p className="position-command-warning">
            <AlertTriangle size={16} />
            У MEXC ручная корректировка доступна только для изолированной маржи.
          </p>
        )}
        <label className="position-command-confirm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          <ShieldCheck size={16} />
          Подтверждаю реальную торговую операцию на MEXC
        </label>
        {command.error && <p className="form-error">{command.error.message}</p>}
        {command.data && (
          <p className={command.data.status === "completed"
            ? "position-command-result"
            : "form-error"}>
            {command.data.message}
          </p>
        )}
        <div className="position-command-actions">
          <Button type="button" onClick={onClose}>Отмена</Button>
          <Button
            type="submit"
            variant={action === "close" ? "danger" : "primary"}
            loading={command.status === "loading"}
            disabled={!confirmed || marginBlocked}
          >
            Выполнить на MEXC
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function cleanSymbol(symbol: string): string {
  return symbol.split(":")[0] ?? symbol;
}
