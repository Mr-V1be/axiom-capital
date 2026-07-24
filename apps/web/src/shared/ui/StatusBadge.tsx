const labels: Record<string, string> = {
  connected: "Активен",
  degraded: "Требует внимания",
  disabled: "Отключён",
  pending: "Подключение",
  calculated: "Рассчитан",
  awaiting_investor: "Ждёт инвестора",
  funded: "Профинансирован",
  distributed: "Распределён",
  cancelled: "Отменён",
  accepted: "Принят",
  partially_filled: "Частично исполнен",
  filled: "Исполнен",
  rejected: "Отклонён",
  failed: "Ошибка",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {labels[status] ?? status}
    </span>
  );
}
