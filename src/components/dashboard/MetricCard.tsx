import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, TrendingUp, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  delay?: number;
  variant?: "default" | "success" | "warning" | "danger";
  icon?: LucideIcon;
  indicator?: "positive" | "negative" | "neutral";
}

export function MetricCard({
  title,
  value,
  suffix = "",
  change,
  changeLabel,
  delay = 0,
  variant = "default",
  icon: Icon,
  indicator,
}: MetricCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  const titleColorClass = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  }[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={cn("text-sm font-medium", titleColorClass)}>{title}</h3>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold tracking-tight text-foreground">
          {value}
        </span>
        {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
        {indicator && (
          <div className={cn(
            "flex h-3 w-3 rounded-full",
            indicator === "positive" && "bg-success",
            indicator === "negative" && "bg-destructive",
            indicator === "neutral" && "bg-warning"
          )} />
        )}
      </div>
      
      {(change !== undefined || changeLabel) && (
        <div className="mt-3 flex items-center gap-2">
          {change !== undefined && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-sm font-medium",
                isPositive && "text-success",
                isNegative && "text-destructive",
                !isPositive && !isNegative && "text-muted-foreground"
              )}
            >
              {isPositive ? (
                <ArrowUp className="h-3 w-3" />
              ) : isNegative ? (
                <ArrowDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              {change > 0 ? "+" : ""}{Math.abs(change)}%
            </span>
          )}
          {changeLabel && (
            <span className="text-sm text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}
