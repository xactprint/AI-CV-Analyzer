import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Magic UI: Number Ticker.
 * Animates from 0 to `value` the first time it scrolls into view.
 */
export function NumberTicker({
  value = 0,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  duration = 1400,
}) {
  const ref = useRef(null);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration, bounce: 0 });
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (inView) motionValue.set(Number(value) || 0);
  }, [inView, value, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      setDisplay(latest.toFixed(decimals));
    });
    return () => unsubscribe();
  }, [spring, decimals]);

  return (
    <span ref={ref} className={cn("tabular-nums tracking-tight", className)}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

export default NumberTicker;
