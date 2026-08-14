import { cn } from "@/lib/utils";

/**
 * The recurring signature element across the site: a circular red "stamp"
 * that echoes the pan in the Be-Nice logo. Used for eyebrows, weekend
 * specials, and section markers instead of generic pill badges.
 */
export function Stamp({
  children,
  size = "md",
  className,
}: {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "h-14 w-14 text-[10px] tracking-wide",
    md: "h-20 w-20 text-xs tracking-wide",
    lg: "h-28 w-28 text-sm tracking-wide",
  };
  return (
    <div
      className={cn(
        "bn-stamp font-display font-semibold uppercase text-center leading-tight p-2 rotate-[-6deg] shadow-md",
        sizes[size],
        className
      )}
    >
      {children}
    </div>
  );
}
