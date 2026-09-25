import { cn } from "@/lib/utils";

/**
 * Magic UI: Marquee — an infinite horizontal scroller.
 * Duplicated track + CSS animation, paused on hover and disabled for users who
 * asked for reduced motion.
 */
export function Marquee({ className, children, reverse = false, pauseOnHover = true }) {
  return (
    <div
      className={cn(
        "group flex w-full overflow-hidden",
        pauseOnHover && "hover:[&>div]:[animation-play-state:paused]"
      )}
    >
      <div
        className={cn("flex shrink-0 animate-marquee items-center gap-4 pr-4", className)}
        style={
          reverse
            ? { animationDirection: "reverse", "--gap": "1rem" }
            : { "--gap": "1rem" }
        }
      >
        {children}
        {children}
      </div>
    </div>
  );
}

export default Marquee;
