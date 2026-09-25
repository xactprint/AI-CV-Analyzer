import { cn } from "@/lib/utils";

/** Simple scrollable region without a visible native scrollbar. */
function ScrollArea({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "no-scrollbar overflow-y-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { ScrollArea };
