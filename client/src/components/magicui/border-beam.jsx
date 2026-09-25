import { cn } from "@/lib/utils";

/**
 * Magic UI: Border Beam — a light travelling around a card border.
 * Uses offset-path so it needs no extra markup and respects prefers-reduced-motion.
 */
export function BorderBeam({ className, duration = 6, size = 90 }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 [mask:linear-gradient(transparent,transparent),linear-gradient(#000,#000)] [mask-composite:intersect] [mask-repeat:no-repeat] [padding:1px] animate-border-beam group-hover:opacity-100",
        className
      )}
      style={{
        offsetPath: "rect(0 auto auto 0 round var(--radius-lg))",
        offsetDistance: "0%",
        background:
          "linear-gradient(to bottom, transparent, var(--primary))",
        WebkitMask:
          "linear-gradient(transparent,transparent), linear-gradient(#000,#000)",
        WebkitMaskComposite: "source-in",
        maskComposite: "intersect",
        maskSize: `${size}px ${size}px`,
        maskRepeat: "no-repeat",
        maskPosition: "0 0",
        WebkitMaskSize: `${size}px ${size}px`,
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "0 0",
        "--duration": `${duration}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

export default BorderBeam;
