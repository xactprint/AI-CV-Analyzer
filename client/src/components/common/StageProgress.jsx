import { useNavigate } from "react-router-dom";
import { Sparkles, TriangleAlert, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shimmer } from "@/components/magicui/shimmer";

/**
 * Staged progress panel used during upload and AI analysis so the app never
 * looks frozen while the backend is working.
 */
export function StageProgress({ stages, index, percent, title = "Working…", className }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="bg-primary/12 text-primary relative grid size-10 place-items-center rounded-full">
            <span className="absolute inset-0 animate-pulse-ring rounded-full border border-primary/40" />
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="font-medium">{title}</p>
            <p className="text-muted-foreground text-xs">
              This usually takes 10–40 seconds. Please keep this tab open.
            </p>
          </div>
        </div>

        <Progress value={percent} className="mb-2" />
        <div className="text-muted-foreground mb-6 flex justify-between text-xs">
          <Shimmer>{stages[index]}</Shimmer>
          <span className="tabular-nums">{percent}%</span>
        </div>

        <ol className="space-y-2.5">
          {stages.map((stage, i) => {
            const done = i < index;
            const active = i === index;
            return (
              <li
                key={stage}
                className={cn(
                  "flex items-center gap-2.5 text-sm transition-colors",
                  active && "text-foreground font-medium",
                  done && "text-muted-foreground",
                  !active && !done && "text-muted-foreground/50"
                )}
              >
                {done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                ) : active ? (
                  <Sparkles className="text-primary size-4 shrink-0 animate-pulse" />
                ) : (
                  <span className="border-border size-4 shrink-0 rounded-full border" />
                )}
                {stage}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

const ICONS = {
  error: { Icon: TriangleAlert, className: "text-destructive" },
  warning: { Icon: TriangleAlert, className: "text-amber-500" },
  info: { Icon: Info, className: "text-sky-500" },
  success: { Icon: CheckCircle2, className: "text-emerald-500" },
};

export function InlineNotice({ type = "info", children, actionLabel, onAction, className }) {
  const { Icon, className: iconClass } = ICONS[type] || ICONS.info;
  return (
    <div
      className={cn(
        "bg-muted/50 flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center",
        className
      )}
    >
      <Icon className={cn("size-4 shrink-0", iconClass)} />
      <div className="min-w-0 flex-1 text-muted-foreground">{children}</div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="text-primary shrink-0 text-sm font-medium hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/** "Explain the match" disclosure used on the match result card. */
export function ExplainMatch({ explanation, className }) {
  const navigate = useNavigate();
  if (!explanation) return null;

  return (
    <div className={cn("bg-card/60 rounded-lg border p-4", className)}>
      <p className="mb-1.5 text-sm font-semibold">Why this score?</p>
      <p className="text-muted-foreground text-sm leading-relaxed">{explanation}</p>
      <p
        role="button"
        tabIndex={0}
        onClick={() => navigate("/matcher")}
        onKeyDown={(e) => e.key === "Enter" && navigate("/matcher")}
        className="text-primary mt-2 cursor-pointer text-xs font-medium hover:underline"
      >
        Run another match →
      </p>
    </div>
  );
}

export default StageProgress;
