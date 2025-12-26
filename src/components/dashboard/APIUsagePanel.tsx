import { useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Settings,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAPIUsage } from "@/hooks/useDataForSEO";

interface APIUsagePanelProps {
  onSettingsClick?: () => void;
}

export function APIUsagePanel({ onSettingsClick }: APIUsagePanelProps) {
  const { stats, loading, fetchUsageStats } = useAPIUsage();

  useEffect(() => {
    fetchUsageStats();
  }, [fetchUsageStats]);

  if (loading && !stats) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const dailyPercent = stats ? (stats.dailyCost / stats.dailyLimit) * 100 : 0;
  const monthlyPercent = stats ? (stats.monthlyCost / stats.monthlyLimit) * 100 : 0;

  const getDailyStatus = () => {
    if (dailyPercent >= 100) return { color: "text-destructive", label: "Limit Reached" };
    if (dailyPercent >= 80) return { color: "text-warning", label: "Near Limit" };
    return { color: "text-success", label: "Normal" };
  };

  const getMonthlyStatus = () => {
    if (monthlyPercent >= 100) return { color: "text-destructive", label: "Limit Reached" };
    if (monthlyPercent >= 80) return { color: "text-warning", label: "Near Limit" };
    return { color: "text-success", label: "Normal" };
  };

  const dailyStatus = getDailyStatus();
  const monthlyStatus = getMonthlyStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              API Usage & Costs
            </CardTitle>
            <CardDescription>
              DataForSEO API consumption tracking
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchUsageStats}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            {onSettingsClick && (
              <Button variant="ghost" size="icon" onClick={onSettingsClick}>
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Daily Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Daily Usage</span>
                <Badge variant="outline" className={cn("text-xs", dailyStatus.color)}>
                  {dailyStatus.label}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                ${stats?.dailyCost.toFixed(2)} / ${stats?.dailyLimit.toFixed(2)}
              </span>
            </div>
            <Progress
              value={Math.min(dailyPercent, 100)}
              className={cn(
                "h-2",
                dailyPercent >= 100 && "[&>div]:bg-destructive",
                dailyPercent >= 80 && dailyPercent < 100 && "[&>div]:bg-warning"
              )}
            />
            {dailyPercent >= 80 && (
              <div className="flex items-center gap-2 text-xs text-warning">
                <AlertTriangle className="h-3 w-3" />
                <span>
                  {dailyPercent >= 100
                    ? "Daily limit reached. API calls may be blocked."
                    : `${(100 - dailyPercent).toFixed(0)}% of daily budget remaining`}
                </span>
              </div>
            )}
          </div>

          {/* Monthly Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">Monthly Usage</span>
                <Badge variant="outline" className={cn("text-xs", monthlyStatus.color)}>
                  {monthlyStatus.label}
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                ${stats?.monthlyCost.toFixed(2)} / ${stats?.monthlyLimit.toFixed(2)}
              </span>
            </div>
            <Progress
              value={Math.min(monthlyPercent, 100)}
              className={cn(
                "h-2",
                monthlyPercent >= 100 && "[&>div]:bg-destructive",
                monthlyPercent >= 80 && monthlyPercent < 100 && "[&>div]:bg-warning"
              )}
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="rounded-lg bg-secondary/30 p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Avg Daily</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">
                ${((stats?.monthlyCost || 0) / new Date().getDate()).toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Projected</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">
                ${(
                  ((stats?.monthlyCost || 0) / new Date().getDate()) *
                  new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
                ).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
