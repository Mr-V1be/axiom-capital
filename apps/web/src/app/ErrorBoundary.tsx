import { Component, ErrorInfo, PropsWithChildren } from "react";
import { AlertOctagon } from "lucide-react";
import { Button } from "../shared/ui/Button";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Uncaught application error", error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal-error">
        <div className="fatal-error__icon">
          <AlertOctagon size={28} />
        </div>
        <p className="eyebrow">Системная ошибка</p>
        <h1>Интерфейс временно недоступен</h1>
        <p>
          Данные и торговые операции не затронуты. Перезагрузите приложение,
          чтобы восстановить интерфейс.
        </p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Перезагрузить
        </Button>
      </main>
    );
  }
}
