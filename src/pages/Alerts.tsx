import { useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  TrendingDown, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  ArrowRight,
  Clock,
  RefreshCw,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/hooks/useAlerts";
import { useBrands } from "@/hooks/useBrands";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type AlertSeverity = "info" | "warning" | "critical" | "success";

function getSeverityStyles(severity: string) {
  switch (severity) {
    case "critical":
      return { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30" };
    case "warning":
      return { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" };
    case "success":
      return { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" };
    default:
      return { icon: Bell, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" };
  }
}

const insights = [
  {
    title: "Content Gap Analysis",
    description: "3 high-impact topics where competitors rank but you don't appear",
    icon: Lightbulb,
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
  },
  {
    title: "Citation Optimization",
    description: "5 of your pages could be better optimized for AI citations",
    icon: TrendingUp,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
  },
  {
    title: "Competitor Threat",
    description: "Salesforce is gaining visibility in 4 of your key prompt categories",
    icon: AlertTriangle,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
  },
];

const Alerts = forwardRef<HTMLDivElement>(function Alerts(_, ref) {
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("all");
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const { activeBrand } = useBrands();
  const { alerts, unreadCount, loading, markAsRead, markAllAsRead } = useAlerts();
  const { toast } = useToast();
  const { isOpen } = useSidebar();

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "unread") return !alert.read;
    if (filter === "critical") return alert.severity === "critical" || alert.severity === "warning";
    return true;
  });

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;

  const handleRunAnalysis = async () => {
    setRunningAnalysis(true);
    try {
      const { error } = await supabase.functions.invoke("scheduled-analysis");
      if (error) throw error;
      toast({ title: "Analysis started", description: "Running full visibility analysis..." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to start analysis", variant: "destructive" });
    } finally {
      setRunningAnalysis(false);
    }
  };

  return (
    <div ref={ref} className="min-h-screen bg-background dark">
      <Sidebar />
      
      <main className={cn(
        "transition-all duration-200 ease-in-out",
        isOpen ? "pl-56" : "pl-0"
      )}>
        <Header title="Alerts & Insights" breadcrumb={[activeBrand?.name || "FORZEO", "Alerts"]} />
        
        <div className="p-6">
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{alerts.length}</p>
                  <p className="text-sm text-muted-foreground">Total Alerts</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{unreadCount}</p>
                  <p className="text-sm text-muted-foreground">Unread</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{criticalCount}</p>
                  <p className="text-sm text-muted-foreground">Critical</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Lightbulb className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{insights.length}</p>
                  <p className="text-sm text-muted-foreground">Insights</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Alerts List */}
            <div className="lg:col-span-2">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Recent Alerts
                      </CardTitle>
                      <CardDescription>Visibility changes, competitor movements, and system notifications</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
                      <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")}>Unread</Button>
                      <Button variant={filter === "critical" ? "default" : "outline"} size="sm" onClick={() => setFilter("critical")}>Critical</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredAlerts.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground">
                        {alerts.length === 0 ? "No alerts yet. Alerts will appear when visibility changes are detected." : "No alerts match your filter criteria"}
                      </div>
                    ) : (
                      filteredAlerts.map((alert, index) => {
                        const styles = getSeverityStyles(alert.severity);
                        const Icon = styles.icon;
                        return (
                          <motion.div key={alert.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * index }}
                            className={cn("rounded-lg border p-4 transition-all cursor-pointer", styles.border, alert.read ? "bg-secondary/20" : styles.bg)}
                            onClick={() => markAsRead(alert.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn("rounded-full p-2", styles.bg)}>
                                <Icon className={cn("h-4 w-4", styles.color)} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className={cn("font-medium", alert.read ? "text-muted-foreground" : "text-foreground")}>{alert.title}</h4>
                                  <span className="text-xs text-muted-foreground">{new Date(alert.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Insights Panel */}
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-400" />
                      AI Insights
                    </CardTitle>
                    <CardDescription>Actionable recommendations to improve your AI visibility</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {insights.map((insight, index) => (
                      <motion.div key={index} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * index + 0.3 }}
                        className="rounded-lg border border-border bg-secondary/20 p-4 hover:bg-secondary/40 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("rounded-lg p-2", insight.bgColor)}>
                            <insight.icon className={cn("h-4 w-4", insight.color)} />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{insight.title}</h4>
                            <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Actions */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={handleRunAnalysis} disabled={runningAnalysis}>
                      {runningAnalysis ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Run Full Analysis
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2" onClick={markAllAsRead} disabled={unreadCount === 0}>
                      <CheckCircle2 className="h-4 w-4" />
                      Mark All as Read
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
});

export default Alerts;
