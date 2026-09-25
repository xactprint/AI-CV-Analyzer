import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Magic UI: Word Cycle — rotates short phrases in the hero headline.
 * Falls back to a static first word when the user prefers reduced motion.
 */
export function WordCycle({ words = ["Understand Your CV.", "Match Your Career."], className }) {
  const [index, setIndex] = useState(0);

  const prefersReduced =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (prefersReduced || words.length < 2) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), 3200);
    return () => clearInterval(id);
  }, [prefersReduced, words.length]);

  if (prefersReduced || words.length < 2) {
    return <span className={cn(className)}>{words[0]}</span>;
  }

  return (
    <span className={cn("relative inline-block overflow-hidden align-bottom", className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[index]}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default WordCycle;
