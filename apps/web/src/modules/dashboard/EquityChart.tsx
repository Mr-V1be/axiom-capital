import { useMemo, useState } from "react";
import { formatMoney } from "../../shared/format/formatters";

interface Point {
  at: string;
  value: string;
}

export function EquityChart({ points }: { points: readonly Point[] }) {
  const [activeIndex, setActiveIndex] = useState(points.length - 1);
  const geometry = useMemo(() => {
    const values = points.map((point) => Number(point.value));
    const min = Math.min(...values) * 0.995;
    const max = Math.max(...values) * 1.005;
    const range = Math.max(1, max - min);
    const mapped = values.map((value, index) => ({
      x: points.length === 1 ? 0 : (index / (points.length - 1)) * 100,
      y: 90 - ((value - min) / range) * 78,
      value,
    }));
    const line = mapped
      .map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`)
      .join(" ");
    const area = `${line} L 100 100 L 0 100 Z`;
    return { mapped, line, area, min, max };
  }, [points]);

  if (!points.length) {
    return <div className="chart-empty">Недостаточно данных для графика</div>;
  }
  const active = geometry.mapped[Math.max(0, activeIndex)]!;
  const activePoint = points[Math.max(0, activeIndex)]!;

  return (
    <div className="equity-chart">
      <div className="equity-chart__tooltip">
        <strong>{formatMoney(active.value)}</strong>
        <span>
          {new Intl.DateTimeFormat("ru-RU", {
            day: "2-digit",
            month: "short",
          }).format(new Date(activePoint.at))}
        </span>
      </div>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Динамика капитала за период"
        onPointerMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const ratio = (event.clientX - bounds.left) / bounds.width;
          setActiveIndex(Math.round(ratio * (points.length - 1)));
        }}
      >
        <defs>
          <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c6ff45" stopOpacity=".22" />
            <stop offset="100%" stopColor="#c6ff45" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[18, 38, 58, 78].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} className="chart-grid" />
        ))}
        <path d={geometry.area} fill="url(#equity-fill)" />
        <path d={geometry.line} className="chart-line" />
        <line
          x1={active.x}
          y1="8"
          x2={active.x}
          y2="94"
          className="chart-crosshair"
        />
        <circle cx={active.x} cy={active.y} r="1.5" className="chart-point" />
      </svg>
      <div className="equity-chart__axis">
        {points
          .filter((_, index) => index % Math.max(1, Math.floor(points.length / 5)) === 0)
          .slice(0, 5)
          .map((point) => (
            <span key={point.at}>
              {new Intl.DateTimeFormat("ru-RU", {
                day: "2-digit",
                month: "short",
              }).format(new Date(point.at))}
            </span>
          ))}
      </div>
    </div>
  );
}
