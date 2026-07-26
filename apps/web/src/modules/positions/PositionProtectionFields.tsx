interface Props {
  type: "take_profit" | "stop_loss";
  triggerPrice: string;
  priceSource: "last" | "mark" | "index";
  onType(value: "take_profit" | "stop_loss"): void;
  onTrigger(value: string): void;
  onSource(value: "last" | "mark" | "index"): void;
}

export function PositionProtectionFields(props: Props) {
  return (
    <div className="form-grid position-protection-fields">
      <label className="field">
        Защита
        <select value={props.type} onChange={(event) =>
          props.onType(event.target.value as Props["type"])}>
          <option value="take_profit">Take Profit</option>
          <option value="stop_loss">Stop Loss</option>
        </select>
      </label>
      <label className="field">
        Цена срабатывания
        <input
          type="number"
          min="0"
          step="any"
          required
          value={props.triggerPrice}
          onChange={(event) => props.onTrigger(event.target.value)}
        />
      </label>
      <label className="field">
        Источник цены
        <select value={props.priceSource} onChange={(event) =>
          props.onSource(event.target.value as Props["priceSource"])}>
          <option value="mark">Mark price</option>
          <option value="last">Last price</option>
          <option value="index">Index price</option>
        </select>
      </label>
    </div>
  );
}
