import { cn } from "@/lib/utils";

/**
 * Magic UI: Spotlight — a soft glow that follows the pointer across a card.
 * Falls back to a static centred glow for keyboard / touch users.
 */
export function Spotlight({ className, color = "var(--primary)" }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute -z-10 h-64 w-64 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-40",
        className
      )}
      style={{ background: color }}
    />
  );
}

export function SpotlightCard({ children, className, color = "var(--primary)" }) {
  const ref = (node) => {
    if (!node) return;
    const onMove = (e) => {
      const rect = node.getBoundingClientRect();
      node.style.setProperty("--spotlight-x", `${e.clientX - rect.left}px`);
      node.style.setProperty("--spotlight-y", `${e.clientY - rect.top}px`);
    };
    const onEnter = () => node.style.setProperty("--spotlight-opacity", "1");
    const onLeave = () => node.style.setProperty("--spotlight-opacity", "0");
    node.addEventListener("mousemove", onMove);
    node.addEventListener("mouseenter", onEnter);
    node.addEventListener("mouseleave", onLeave);
  };

  return (
    <div
      ref={ref}
      className={cn("group relative overflow-hidden", className)}
      style={{ "--spotlight-opacity": 0 }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px opacity-[var(--spotlight-opacity)] transition-opacity duration-300"
        style={{
          "--spotlight-color": color,
          background:
            "radial-gradient(220px circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), color-mix(in oklab, var(--spotlight-color) 22%, transparent), transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}

export default Spotlight;
