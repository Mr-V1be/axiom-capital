import { CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";

interface ToastProps {
  message: string | null;
  onClose(): void;
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timeout);
  }, [message, onClose]);

  if (!message) return null;
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={18} />
      <span>{message}</span>
      <button onClick={onClose}>
        <X size={15} />
        <span className="visually-hidden">Закрыть</span>
      </button>
    </div>
  );
}
