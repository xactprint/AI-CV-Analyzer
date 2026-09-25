import { Loader2, Inbox, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Consistent error surface so a failure is never a bare red screen. */
export function ErrorState({ error, onRetry, className, title = "Something went wrong" }) {
  const message =
    typeof error === "string" ? error : error?.message || "An unexpected error occurred.";

  return (
    <Alert variant="destructive" className={cn("items-start", className)}>
      <TriangleAlert />
      <AlertTitle className="line-clamp-none">{title}</AlertTitle>
      <AlertDescription>
        <p className="line-clamp-none">{message}</p>
        {Array.isArray(error?.details) && (
          <ul className="mt-1 list-disc pl-4">
            {error.details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/** Consistent empty state. */
export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center",
        className
      )}
    >
      <span className="bg-muted text-muted-foreground mb-3 grid size-11 place-items-center rounded-full">
        <Icon className="size-5" />
      </span>
      <p className="font-medium">{title}</p>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Consistent loading state with skeletons. */
export function LoadingState({ label = "Loading…", className }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-live="polite">
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="size-3.5 animate-spin" />
        {label}
      </p>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

export default ErrorState;
