import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Magic UI: Fade In — scroll-triggered reveal used across the landing page. */
export function FadeIn({ children, className, delay = 0, y = 24, once = true }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

export default FadeIn;
