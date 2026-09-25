import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const TONES = {
  gradient: "from-primary to-cyan-500",
  emerald: "from-emerald-500 to-teal-400",
  amber: "from-amber-500 to-orange-400",
  violet: "from-violet-500 to-fuchsia-400",
};

export function StatCard({ label, value, suffix = "", icon: Icon, tone = "gradient", hint, className }) {
  return (
    <div
      className={cn(
        "bg-card relative overflow-hidden rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      <div
        className={cn(
          "absolute -top-8 -right-8 size-24 rounded-full bg-linear-to-br opacity-10 blur-2xl",
          TONES[tone] || TONES.gradient
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground truncate text-xs font-medium tracking-wide uppercase">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {value}
            {suffix && <span className="text-muted-foreground ml-0.5 text-lg">{suffix}</span>}
          </p>
          {hint && <p className="text-muted-foreground mt-1 truncate text-xs">{hint}</p>}
        </div>
        {Icon && (
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-lg bg-linear-to-br text-white",
              TONES[tone] || TONES.gradient
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions, breadcrumb }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {breadcrumb && (
          <Link
            to="/dashboard"
            className="text-muted-foreground hover:text-primary mb-1 inline-block text-xs font-medium"
          >
            ← Back to dashboard
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export default StatCard;
