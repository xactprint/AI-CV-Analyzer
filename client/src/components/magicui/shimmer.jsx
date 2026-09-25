import { cn } from "@/lib/utils";

/** Magic UI: Shimmer — animated gradient sweep for skeleton / loading text. */
export function Shimmer({ className, duration = 2.5, children }) {
  return (
    <span
      className={cn(
        "bg-[linear-gradient(110deg,var(--muted)_8%,var(--accent)_18%,var(--muted)_33%)] bg-[length:200%_100%] animate-shimmer",
        className
      )}
      style={{ "--duration": `${duration}s`, animationDuration: `${duration}s` }}
    >
      {children}
    </span>
  );
}

export default Shimmer;
