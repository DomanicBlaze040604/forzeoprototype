import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useCostTracking } from "@/hooks/useCostTracking";
import { 
  DollarSign, 
  AlertTriangle, 
  Settings,
  RefreshCw,
  Bell,
  Info
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function CostTrackingPanel() {
  const { summary, loading, fetchSummary, setLimits } = useCostTracking();
  const [showSettings, setShowSettings] = useState(false);
  const [newLimits, setNewLimits] = useState({
    dailyLimit: 10,
    monthlyLimit: 100,
    alertThreshold: 80,
    emailOnThreshold: false, // Disabled - in-app only
  });

  if (!summary) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading cost data...
        </CardContent>
      </Card>
    );
  }

  const dailyPercent = (summary.daily.cost / summary.limits.daily) * 100;
  const monthlyPercent = (summary.monthly.cost / summary.limits.monthly) * 100;

  const handleSaveLimits = async () => {
    await setLimits(newLimits);
    setShowSettings(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          API Cost Tracking
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchSummary}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cost Limits</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Daily Limit ($)</Label>
                  <Input
                    type="number"
                    value={newLimits.dailyLimit}
                    onChange={(e) => setNewLimits(l => ({ ...l, dailyLimit: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Limit ($)</Label>
                  <Input
                    type="number"
                    value={newLimits.monthlyLimit}
                    onChange={(e) => setNewLimits(l => ({ ...l, monthlyLimit: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Alert Threshold (%)</Label>
                  <Input
                    type="number"
                    value={newLimits.alertThreshold}
                    onChange={(e) => setNewLimits(l => ({ ...l, alertThreshold: Number(e.target.value) }))}
                  />
                </div>
                
                {/* In-app alerts only notice */}
                <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                  <Bell className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">In-app alerts only</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Cost alerts are shown in the dashboard. Email notifications coming soon.
                    </p>
                  </div>
                </div>
                
                <Button onClick={handleSaveLimits} className="w-full">Save Limits</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Alerts */}
        {(summary.alerts.dailyWarning || summary.alerts.monthlyWarning) && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <span className="text-sm">
              {summary.alerts.dailyExceeded 
                ? "Daily limit exceeded!" 
                : summary.alerts.monthlyExceeded
                ? "Monthly limit exceeded!"
                : "Approaching cost limit"}
            </span>
          </div>
        )}

        {/* Daily Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Daily Usage</span>
            <span>${summary.daily.cost.toFixed(4)} / ${summary.limits.daily}</span>
          </div>
          <Progress value={Math.min(100, dailyPercent)} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {summary.daily.calls} API calls today
          </div>
        </div>

        {/* Monthly Usage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Monthly Usage</span>
            <span>${summary.monthly.cost.toFixed(4)} / ${summary.limits.monthly}</span>
          </div>
          <Progress value={Math.min(100, monthlyPercent)} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {summary.monthly.calls} API calls this month
          </div>
        </div>

        {/* Alert Mode Notice */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-xs text-muted-foreground cursor-help">
                <Info className="h-3 w-3" />
                <span>In-app alerts only</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs max-w-[200px]">
                Alerts appear in the dashboard when thresholds are reached. 
                Email notifications are not yet available.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Breakdown by API */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Cost by API (Today)</h4>
          <div className="space-y-1">
            {Object.entries(summary.daily.byApi).map(([api, cost]) => (
              <div key={api} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{api}</span>
                <span>${(cost as number).toFixed(4)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
