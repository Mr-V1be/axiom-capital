import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string;
  caption: ReactNode;
  icon: LucideIcon;
  tone?: "positive" | "negative" | "neutral";
}

export function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = "neutral",
}: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card__top">
        <span>{label}</span>
        <span className="metric-card__icon">
          <Icon size={17} strokeWidth={1.8} />
        </span>
      </div>
      <strong className="metric-card__value">{value}</strong>
      <div className={`metric-card__caption tone-${tone}`}>{caption}</div>
    </article>
  );
}
