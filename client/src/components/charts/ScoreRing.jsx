import { useId } from "react";
import { cn } from "@/lib/utils";

/** Animated circular score gauge used for the CV score and match score. */
export function ScoreRing({
  value = 0,
  size = 168,
  stroke = 12,
  label = "CV Score",
  sublabel,
  tone = "primary",
  className,
}) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;

  const tones = {
    primary: ["hsl(var(--primary))", "hsl(var(--chart-2))"],
    success: ["hsl(0.72 0.17 150)", "hsl(0.72 0.19 195)"],
    warning: ["hsl(0.78 0.16 80)", "hsl(0.72 0.19 45)"],
    danger: ["hsl(0.62 0.21 25)", "hsl(0.66 0.2 350)"],
  };
  const [from, to] = tones[tone] || tones.primary;
  const rawId = useId();
  const gid = `ring-${rawId.replace(/:/g, "")}`;

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="text-4xl font-semibold tracking-tight tabular-nums">
            {Math.round(safe)}
            <span className="text-muted-foreground text-xl">%</span>
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs font-medium">{label}</p>
          {sublabel && <p className="text-muted-foreground/80 mt-0.5 text-[11px]">{sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

export default ScoreRing;
