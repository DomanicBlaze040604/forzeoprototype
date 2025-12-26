import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import {
  Activity,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Server,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBatchProcessor, ThroughputMetrics } from "@/hooks/useBatchProcessor";
import { useTrustAnalytics, TrustSummary, HistoricalSnapshot } from "@/hooks/useTrustAnalytics";
import { formatDistanceToNow } from "date-fns";

interface ScaleDashboardProps {
  organizationId?: string;
}

export function ScaleDashboard({ organizationId }: ScaleDashboardProps) {
  const { getThroughput, batches, listBatches } = useBatchProcessor();
  const { 
    summary, 
    executiveStatement, 
    fetchTrustSummary,
    fetchHistoricalSnapshots,
    fetchTrustTrends,
  } = useTrustAnalytics();
  
  const [throughput, setThroughput] = useState<ThroughputMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalSnapshot[]>([]);
  const [selectedEngine, setSelectedEngine] = useState<string>("google_ai_mode");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [throughputData, historical] = await Promise.all([
        getThroughput(24),
        fetchHistoricalSnapshots(selectedEngine, 30),
      ]);
      setThroughput(throughputData);
      setHistoricalData(historical);
      await listBatches();
      setLoading(false);
    };
    
    loadData();
  }, [getThroughput, fetchHistoricalSnapshots, listBatches, selectedEngine]);

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      getThroughput(24).then(setThroughput),
      fetchTrustSummary(),
      listBatches(),
    ]);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Executive Statement */}
      {executiveStatement && (
        <div className={cn(
          "p-4 rounded-lg border",
          executiveStatement.includes("⚠️") ? "bg-yellow-500/10 border-yellow-500/30" :
          executiveStatement.includes("📉") ? "bg-red-500/10 border-red-500/30" :
          "bg-green-500/10 border-green-500/30"
        )}>
          <p className="text-sm font-medium">{executiveStatement}</p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Throughput</p>
                <p className="text-2xl font-bold">
                  {throughput?.summary.avgThroughputPerMinute || "0"}/min
                </p>
              </div>
              <Activity className="h-8 w-8 text-primary opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {throughput?.summary.totalJobs.toLocaleString() || 0} jobs in 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className={cn(
                  "text-2xl font-bold",
                  parseFloat(throughput?.summary.successRate || "0") >= 95 ? "text-green-500" :
                  parseFloat(throughput?.summary.successRate || "0") >= 80 ? "text-yellow-500" : "text-red-500"
                )}>
                  {throughput?.summary.successRate || "0"}%
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {throughput?.summary.failedJobs || 0} failed jobs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Engine Health</p>
                <p className={cn(
                  "text-2xl font-bold",
                  summary?.healthyEngines === summary?.totalEngines ? "text-green-500" :
                  summary?.unavailableEngines === 0 ? "text-yellow-500" : "text-red-500"
                )}>
                  {summary?.healthyEngines || 0}/{summary?.totalEngines || 0}
                </p>
              </div>
              <Server className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summary?.activeOutages || 0} active outages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Authority</p>
                <p className="text-2xl font-bold">
                  {((summary?.avgAuthority || 1) * 100).toFixed(0)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summary?.enginesImproving || 0} improving, {summary?.enginesDeclining || 0} declining
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="throughput" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="throughput">Throughput</TabsTrigger>
            <TabsTrigger value="trust">Trust Trends</TabsTrigger>
            <TabsTrigger value="batches">Batches</TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="icon" onClick={refreshData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Throughput Tab */}
        <TabsContent value="throughput">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                24-Hour Throughput
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={throughput?.hourlyMetrics || []}>
                    <defs>
                      <linearGradient id="throughputGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="hour_bucket" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      tickFormatter={(value) => new Date(value).getHours() + ":00"}
                    />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: any, name: string) => [
                        name === "jobs_completed" ? `${value} completed` :
                        name === "jobs_failed" ? `${value} failed` :
                        `${value} jobs`,
                        name
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="jobs_completed"
                      stroke="hsl(var(--primary))"
                      fill="url(#throughputGradient)"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="jobs_failed"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trust Trends Tab */}
        <TabsContent value="trust">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Authority Trends (30 Days)
                </CardTitle>
                <select
                  className="text-sm border rounded px-2 py-1"
                  value={selectedEngine}
                  onChange={(e) => setSelectedEngine(e.target.value)}
                >
                  {summary?.engines.map(e => (
                    <option key={e.engine} value={e.engine}>{e.displayName}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis 
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      domain={[0.5, 1.5]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="authorityWeight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                      name="Authority"
                    />
                    <Line
                      type="monotone"
                      dataKey="reliabilityScore"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Reliability"
                      yAxisId={0}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Engine Status Grid */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                {summary?.engines.map(engine => (
                  <div
                    key={engine.engine}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-all",
                      selectedEngine === engine.engine ? "border-primary bg-primary/5" : "border-border",
                      engine.status === "unavailable" && "opacity-50"
                    )}
                    onClick={() => setSelectedEngine(engine.engine)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{engine.displayName}</span>
                      <Badge variant={
                        engine.trend30d === "improving" ? "default" :
                        engine.trend30d === "declining" ? "destructive" : "secondary"
                      }>
                        {engine.trend30d === "improving" ? "↑" : 
                         engine.trend30d === "declining" ? "↓" : "→"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{(engine.authorityWeight * 100).toFixed(0)}% authority</span>
                      <span className={cn(
                        engine.authorityChange30d > 0 ? "text-green-500" :
                        engine.authorityChange30d < 0 ? "text-red-500" : ""
                      )}>
                        {engine.authorityChange30d > 0 ? "+" : ""}
                        {(engine.authorityChange30d * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batches Tab */}
        <TabsContent value="batches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Recent Batches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {batches.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No batches submitted yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {batches.map(batch => (
                    <div key={batch.id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            batch.status === "completed" ? "default" :
                            batch.status === "failed" ? "destructive" :
                            batch.status === "processing" ? "secondary" : "outline"
                          }>
                            {batch.status}
                          </Badge>
                          <span className="text-sm font-medium">
                            {batch.totalJobs.toLocaleString()} jobs
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          ${batch.actualCost?.toFixed(4) || batch.estimatedCost?.toFixed(4)}
                        </span>
                      </div>
                      <Progress value={batch.progressPercentage} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{batch.completedJobs}/{batch.totalJobs} completed</span>
                        {batch.failedJobs > 0 && (
                          <span className="text-red-500">{batch.failedJobs} failed</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scale Readiness Indicator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Scale Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-secondary/30 text-center">
              <p className="text-3xl font-bold text-primary">1M+</p>
              <p className="text-sm text-muted-foreground">Prompts/Day Capacity</p>
              <p className="text-xs text-muted-foreground mt-1">
                ~694/minute sustained
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30 text-center">
              <p className="text-3xl font-bold text-green-500">
                {summary?.healthyEngines || 0}/{summary?.totalEngines || 0}
              </p>
              <p className="text-sm text-muted-foreground">Engines Healthy</p>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.activeOutages || 0} active outages
              </p>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30 text-center">
              <p className="text-3xl font-bold">
                {historicalData.length}
              </p>
              <p className="text-sm text-muted-foreground">Days of Trust Data</p>
              <p className="text-xs text-muted-foreground mt-1">
                Longitudinal tracking active
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
