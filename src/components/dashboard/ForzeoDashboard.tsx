import { useState } from "react";
import { ForzeoMetricCard } from "./ForzeoMetricCard";
import { ForzeoStatusBadge } from "./ForzeoStatusBadge";
import { ForzeoTable } from "./ForzeoTable";
import { DataForSEOStatusBanner } from "./DataForSEOStatusBanner";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AlertCircle, ChevronRight, RefreshCw, Loader2 } from "lucide-react";
import { useVisibilityData } from "@/hooks/useVisibilityData";
import { useEngineAuthority } from "@/hooks/useEngineAuthority";
import { usePrioritizedInsights } from "@/hooks/usePrioritizedInsights";
import { formatDistanceToNow } from "date-fns";

interface ForzeoDashboardProps {
  brandId?: string;
  brandName?: string;
}

export function ForzeoDashboard({ brandId, brandName = "Your Brand" }: ForzeoDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d">("7d");
  
  const {
    metrics,
    trendData,
    enginePerformance,
    promptPerformance,
    loading,
    refresh,
    fetchTrendData,
  } = useVisibilityData(brandId);
  
  const { engines, hasActiveOutages, overallHealth } = useEngineAuthority();
  const { weeklyPriorities, loading: insightsLoading } = usePrioritizedInsights(brandId);

  const handlePeriodChange = async (period: "7d" | "30d" | "90d") => {
    setSelectedPeriod(period);
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    await fetchTrendData(days);
  };

  // Format trend data for chart
  const chartData = trendData.map(d => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: d.visibility,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-page-title text-foreground">{brandName}</h1>
            <p className="text-body-sm text-muted-foreground mt-1">
              AI Search Visibility Analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-fz"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* DataForSEO API Status */}
        <DataForSEOStatusBanner />

        {/* System Status */}
        <div className="flex items-center gap-2 text-body-sm">
          {hasActiveOutages ? (
            <>
              <div className="h-2 w-2 rounded-full bg-fz-amber" />
              <span className="text-fz-amber">Some engines degraded</span>
            </>
          ) : (
            <>
              <div className="h-2 w-2 rounded-full bg-fz-green" />
              <span className="text-muted-foreground">All engines operational</span>
            </>
          )}
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            {metrics.lastUpdated
              ? `Updated ${formatDistanceToNow(new Date(metrics.lastUpdated), { addSuffix: true })}`
              : "No data yet"}
          </span>
        </div>

        {/* Data Availability Warning */}
        {!metrics.dataAvailable && !loading && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-[10px] bg-secondary border border-border">
            <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-body-sm text-muted-foreground">
              No visibility data available yet. Run analysis on prompts to see metrics.
            </span>
          </div>
        )}

        {/* Top Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <ForzeoMetricCard
            label="AI Visibility Score"
            value={metrics.aiVisibilityScore ?? "—"}
            delta={metrics.scoreDelta}
            deltaLabel="vs last period"
            loading={loading}
          />
          <ForzeoMetricCard
            label="Citation Score"
            value={metrics.citationScore ?? "—"}
            delta={metrics.citationDelta}
            deltaLabel="vs last period"
            loading={loading}
          />
          <ForzeoMetricCard
            label="Authority Score"
            value={metrics.authorityScore ?? "—"}
            delta={metrics.authorityDelta}
            deltaLabel="vs last period"
            loading={loading}
          />
          <ForzeoMetricCard
            label="Share of Voice"
            value={metrics.shareOfVoice != null ? metrics.shareOfVoice.toFixed(1) : "—"}
            suffix={metrics.shareOfVoice != null ? "%" : ""}
            delta={metrics.sovDelta}
            deltaLabel="vs last period"
            loading={loading}
          />
        </div>

        {/* Middle Section - Charts & Engine Comparison */}
        <div className="grid grid-cols-3 gap-4">
          {/* Trend Chart */}
          <div className="col-span-2 fz-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="fz-section-header mb-0">Visibility Trend</h2>
              <div className="flex gap-2">
                {(["7d", "30d", "90d"] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => handlePeriodChange(period)}
                    className={cn(
                      "px-3 py-1 rounded text-body-sm transition-colors duration-fz",
                      selectedPeriod === period
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[240px]">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-body-sm">
                  No trend data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "10px",
                        fontSize: "13px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: "#3B82F6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Engine Comparison */}
          <div className="fz-card p-5">
            <h2 className="fz-section-header">Engine Performance</h2>
            {loading ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : enginePerformance.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-body-sm">
                No engine data available
              </div>
            ) : (
              <div className="space-y-3">
                {enginePerformance.slice(0, 5).map((engine) => (
                  <div key={engine.engine} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-medium truncate">
                          {engine.displayName}
                        </span>
                        {engine.status !== "healthy" && (
                          <AlertCircle className="h-3 w-3 text-fz-amber flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-fz",
                              engine.status === "healthy" ? "bg-fz-blue" : "bg-fz-amber"
                            )}
                            style={{ width: `${engine.visibility ?? 0}%` }}
                          />
                        </div>
                        <span className="text-body-sm tabular-nums font-medium w-8">
                          {engine.visibility ?? "—"}
                        </span>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-body-sm tabular-nums ml-3",
                        engine.trend != null && engine.trend > 0
                          ? "text-fz-green"
                          : engine.trend != null && engine.trend < 0
                          ? "text-fz-red"
                          : "text-muted-foreground"
                      )}
                    >
                      {engine.trend != null ? (
                        <>
                          {engine.trend > 0 ? "+" : ""}
                          {engine.trend}%
                        </>
                      ) : (
                        "—"
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Prompt Performance Table */}
        <div className="fz-card">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="fz-section-header mb-0">Prompt Performance</h2>
            <button className="text-body-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors duration-fz">
              View all <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : promptPerformance.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-body-sm">
              No prompts analyzed yet
            </div>
          ) : (
            <ForzeoTable
              columns={[
                {
                  key: "prompt",
                  header: "Prompt",
                  render: (item) => (
                    <div className="max-w-md">
                      <span className="text-foreground">{item.prompt}</span>
                    </div>
                  ),
                },
                {
                  key: "visibility",
                  header: "Visibility",
                  width: "100px",
                  render: (item) => (
                    <span className="tabular-nums font-medium">
                      {item.visibility ?? "—"}
                    </span>
                  ),
                },
                {
                  key: "engines",
                  header: "Engines",
                  width: "80px",
                  align: "center",
                  render: (item) => (
                    <span className="tabular-nums">
                      {item.enginesCount}/{item.totalEngines}
                    </span>
                  ),
                },
                {
                  key: "citations",
                  header: "Citations",
                  width: "80px",
                  align: "center",
                  render: (item) => (
                    <span className="tabular-nums">{item.citations}</span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  width: "120px",
                  render: (item) => (
                    <ForzeoStatusBadge
                      variant={
                        item.status === "verified"
                          ? "verified"
                          : item.status === "partial"
                          ? "partial"
                          : item.status === "hallucinated"
                          ? "hallucinated"
                          : "neutral"
                      }
                    >
                      {item.status === "verified"
                        ? "Verified"
                        : item.status === "partial"
                        ? "Partial"
                        : item.status === "hallucinated"
                        ? "Hallucinated"
                        : "Pending"}
                    </ForzeoStatusBadge>
                  ),
                },
              ]}
              data={promptPerformance}
              keyExtractor={(item) => item.id}
            />
          )}
        </div>

        {/* Bottom Section - Insights & Engine Authority */}
        <div className="grid grid-cols-2 gap-4">
          {/* Weekly Priorities */}
          <div className="fz-card">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="fz-section-header mb-0">What to Fix This Week</h2>
            </div>
            {insightsLoading ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : weeklyPriorities.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-body-sm">
                No priority actions identified
              </div>
            ) : (
              <div className="divide-y divide-border">
                {weeklyPriorities.slice(0, 3).map((insight, index) => (
                  <div key={insight.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-fz-blue/10 text-fz-blue flex items-center justify-center text-meta font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body-sm text-foreground">
                          {insight.recommended_action}
                        </p>
                        <p className="text-meta text-muted-foreground mt-1">
                          {insight.impact_explanation}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <ForzeoStatusBadge variant="neutral">
                            {insight.estimated_effort} effort
                          </ForzeoStatusBadge>
                          {insight.status === "in_progress" && (
                            <ForzeoStatusBadge variant="info">
                              In progress
                            </ForzeoStatusBadge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Engine Authority */}
          <div className="fz-card">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="fz-section-header mb-0">Engine Authority</h2>
            </div>
            <div className="p-5 space-y-4">
              {/* Health Summary */}
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full mt-1.5 flex-shrink-0",
                    overallHealth >= 80 ? "bg-fz-green" : overallHealth >= 50 ? "bg-fz-amber" : "bg-fz-red"
                  )}
                />
                <div>
                  <p className="text-body-sm text-foreground">
                    {overallHealth}% engine health
                  </p>
                  <p className="text-meta text-muted-foreground mt-1">
                    {engines.filter(e => e.status === "healthy").length} of {engines.length} engines healthy
                  </p>
                </div>
              </div>

              {/* Engine Authority Weights */}
              <div className="pt-4 border-t border-border">
                <p className="text-meta text-muted-foreground mb-3">
                  Authority Weights
                </p>
                {engines.length === 0 ? (
                  <p className="text-meta text-muted-foreground">No engine data</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {engines.slice(0, 3).map((engine) => (
                      <div
                        key={engine.engine}
                        className="bg-secondary/50 rounded px-2 py-1.5 text-center"
                      >
                        <div className="text-meta text-muted-foreground truncate">
                          {engine.display_name}
                        </div>
                        <div className="text-body-sm font-medium tabular-nums">
                          {engine.authority_weight.toFixed(2)}x
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
