import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export function LoadingState({ label = "Загружаем данные" }: { label?: string }) {
  return (
    <div className="data-state">
      <span className="spinner spinner--large" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({
  error,
  retry,
}: {
  error: Error;
  retry(): void;
}) {
  return (
    <div className="data-state data-state--error">
      <AlertTriangle size={24} />
      <strong>Не удалось получить данные</strong>
      <p>{error.message}</p>
      <Button onClick={retry}>
        <RefreshCw size={15} />
        Повторить
      </Button>
    </div>
  );
}
