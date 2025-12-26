import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Loader2, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ForzeoMetricCardProps {
  label: string;
  value: string | number;
  delta?: number | null;
  deltaLabel?: string;
  suffix?: string;
  className?: string;
  loading?: boolean;
}

export function ForzeoMetricCard({
  label,
  value,
  delta,
  deltaLabel,
  suffix,
  className,
  loading = false,
}: ForzeoMetricCardProps) {
  const getDeltaColor = () => {
    if (delta == null) return "text-muted-foreground";
    if (delta > 0) return "text-fz-green";
    if (delta < 0) return "text-fz-red";
    return "text-muted-foreground";
  };

  const getDeltaIcon = () => {
    if (delta == null) return <Minus className="h-3 w-3" />;
    if (delta > 0) return <TrendingUp className="h-3 w-3" />;
    if (delta < 0) return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  // Show explicit message when delta is null (insufficient historical data)
  const showInsufficientData = delta === null && !loading && value !== "—";

  return (
    <div className={cn("fz-card p-5", className)}>
      <div className="fz-metric-label mb-2">{label}</div>
      <div className="flex items-baseline gap-1">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <span className="fz-metric tabular-nums">{value}</span>
            {suffix && value !== "—" && (
              <span className="text-[18px] font-medium text-muted-foreground">
                {suffix}
              </span>
            )}
          </>
        )}
      </div>
      {!loading && (
        <div className={cn("flex items-center gap-1 mt-2", getDeltaColor())}>
          {showInsufficientData ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-muted-foreground cursor-help">
                    <HelpCircle className="h-3 w-3" />
                    <span className="text-[13px]">Insufficient data</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-[200px]">
                    Not enough historical data to calculate trend. 
                    Run more analyses over time to see deltas.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : delta !== undefined ? (
            <>
              {getDeltaIcon()}
              <span className="text-[13px] font-medium tabular-nums">
                {delta != null ? (
                  <>
                    {delta > 0 ? "+" : ""}
                    {delta}%
                  </>
                ) : (
                  "—"
                )}
              </span>
              {deltaLabel && (
                <span className="text-muted-foreground text-[11px] ml-1">
                  {deltaLabel}
                </span>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
