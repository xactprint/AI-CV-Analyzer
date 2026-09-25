import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Magic UI: Animated Card — a subtle lift + border glow on hover.
 * Pairs with BorderBeam for the "premium card" feel without over-animating.
 */
export function AnimatedCard({ className, children, ...props }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("group relative", className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedCard;
