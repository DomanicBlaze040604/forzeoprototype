import { cn } from "@/lib/utils";

type BadgeVariant = "verified" | "partial" | "hallucinated" | "info" | "warning" | "neutral";

interface ForzeoStatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  verified: "bg-fz-green/10 text-fz-green border-fz-green/20",
  partial: "bg-fz-amber/10 text-fz-amber border-fz-amber/20",
  hallucinated: "bg-fz-red/10 text-fz-red border-fz-red/20",
  info: "bg-fz-blue/10 text-fz-blue border-fz-blue/20",
  warning: "bg-fz-amber/10 text-fz-amber border-fz-amber/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function ForzeoStatusBadge({
  variant,
  children,
  className,
}: ForzeoStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
