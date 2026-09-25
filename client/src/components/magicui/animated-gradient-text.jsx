import { cn } from "@/lib/utils";

/** Magic UI: Animated Gradient — slowly shifting gradient text or background. */
export function AnimatedGradientText({ className, children }) {
  return (
    <span
      className={cn(
        "animate-gradient bg-[linear-gradient(90deg,var(--primary),var(--chart-2),var(--chart-3),var(--primary))] bg-[length:300%_300%] bg-clip-text text-transparent",
        className
      )}
    >
      {children}
    </span>
  );
}

export function AnimatedGradientBorder({ className, children }) {
  return (
    <div className={cn("relative rounded-2xl p-px", className)}>
      <div className="animate-gradient absolute inset-0 rounded-2xl bg-[linear-gradient(90deg,var(--primary),var(--chart-2),var(--chart-3),var(--primary))] bg-[length:300%_300%] opacity-60" />
      <div className="bg-card relative rounded-[calc(1rem-1px)]">{children}</div>
    </div>
  );
}

export default AnimatedGradientText;
