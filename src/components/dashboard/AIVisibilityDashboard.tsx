import { useState } from "react";
import { cn } from "@/lib/utils";
import { ForzeoMetricCard } from "./ForzeoMetricCard";
import { ForzeoStatusBadge } from "./ForzeoStatusBadge";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface EngineMetrics {
  engine: string;
  visibility: number;
  citations: number;
  sentiment: "positive" | "neutral" | "negative";
  trend: number;
  authorityWeight?: number;
  status?: "healthy" | "degraded" | "unavailable";
  weightedScore?: number;
}

interface AIVisibilityDashboardProps {
  brandName: string;
  overallScore: number;
  citationScore: number;
  authorityScore: number;
  shareOfVoice: number;
  engineMetrics: EngineMetrics[];
  trendData: Array<{ date: string; visibility: number; citations: number }>;
  loading?: boolean;
  onRefresh?: () => void;
  weightedScore?: number;
  isEstimated?: boolean;
  confidenceLevel?: "high" | "medium" | "low";
  degradedEngines?: string[];
  lowAuthorityImpact?: string;
  scoreDelta?: number | null;
  citationDelta?: number | null;
  authorityDelta?: number | null;
  sovDelta?: number | null;
  dataAvailable?: boolean;
}

const ENGINE_NAMES: Record<string, string> = {
  google_sge: "Google AI Mode",
  google_ai_mode: "Google AI Mode",
  bing_copilot: "Bing Copilot",
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  gemini: "Gemini",
  claude: "Claude",
};

export function AIVisibilityDashboard({
  overallScore,
  citationScore,
  authorityScore,
  shareOfVoice,
  engineMetrics,
  trendData,
  loading = false,
  onRefresh,
  weightedScore,
  isEstimated = false,
  confidenceLevel = "high",
  degradedEngines = [],
  lowAuthorityImpact,
  scoreDelta,
  citationDelta,
  authorityDelta,
  sovDelta,
  dataAvailable = true,
}: AIVisibilityDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");

  const displayScore = weightedScore ?? overallScore;
  const hasAuthorityData = weightedScore !== undefined;

  return (
    <div className="space-y-6">
      {/* No Data Warning */}
      {!dataAvailable && !loading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[10px] bg-secondary border border-border">
          <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-body-sm text-muted-foreground">
            No visibility data available yet. Run analysis on prompts to see metrics.
          </span>
        </div>
      )}

      {/* Degraded Mode Banner */}
      {(isEstimated || degradedEngines.length > 0) && dataAvailable && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[10px] bg-fz-amber/5 border border-fz-amber/20">
          <AlertCircle className="h-4 w-4 text-fz-amber flex-shrink-0" />
          <div className="flex-1">
            <span className="text-body-sm text-foreground">
              {isEstimated
                ? "Estimated scores in use"
                : `${degradedEngines.length} engine(s) experiencing issues`}
            </span>
            <span className="text-body-sm text-muted-foreground ml-2">
              · Confidence: {confidenceLevel}
            </span>
          </div>
          {lowAuthorityImpact && (
            <span className="text-meta text-muted-foreground">
              {lowAuthorityImpact}
            </span>
          )}
        </div>
      )}

      {/* Top Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <ForzeoMetricCard
          label="AI Visibility Score"
          value={dataAvailable ? displayScore : "—"}
          delta={scoreDelta}
          deltaLabel="vs last period"
          loading={loading}
        />
        <ForzeoMetricCard
          label="Citation Score"
          value={dataAvailable ? citationScore : "—"}
          delta={citationDelta}
          deltaLabel="vs last period"
          loading={loading}
        />
        <ForzeoMetricCard
          label="Authority Score"
          value={dataAvailable ? authorityScore : "—"}
          delta={authorityDelta}
          deltaLabel="vs last period"
          loading={loading}
        />
        <ForzeoMetricCard
          label="Share of Voice"
          value={dataAvailable ? shareOfVoice.toFixed(1) : "—"}
          suffix={dataAvailable ? "%" : ""}
          delta={sovDelta}
          deltaLabel="vs last period"
          loading={loading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Trend Chart */}
        <div className="col-span-2 fz-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-section-header text-foreground">
              Visibility Trend
            </h2>
            <div className="flex items-center gap-2">
              {(["7d", "30d", "90d"] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
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
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={loading}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-fz ml-2"
                >
                  <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                </button>
              )}
            </div>
          </div>
          <div className="h-[240px]">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-body-sm">
                No trend data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="visGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
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
                  <Area
                    type="monotone"
                    dataKey="visibility"
                    stroke="#3B82F6"
                    fill="url(#visGradient)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="citations"
                    stroke="#22C55E"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex items-center justify-center gap-6 mt-3">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 bg-fz-blue rounded" />
              <span className="text-meta text-muted-foreground">Visibility</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 bg-fz-green rounded" />
              <span className="text-meta text-muted-foreground">Citations</span>
            </div>
          </div>
        </div>

        {/* Engine Performance */}
        <div className="fz-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-section-header text-foreground">
              Engine Performance
            </h2>
            {hasAuthorityData && (
              <ForzeoStatusBadge variant="info">Weighted</ForzeoStatusBadge>
            )}
          </div>
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : engineMetrics.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground text-body-sm">
              No engine data available
            </div>
          ) : (
            <div className="space-y-3">
              {engineMetrics.map((engine) => {
                const isHealthy = engine.status !== "degraded" && engine.status !== "unavailable";
                const displayName = ENGINE_NAMES[engine.engine] || engine.engine;

                return (
                  <div key={engine.engine} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-medium text-foreground">
                          {displayName}
                        </span>
                        {!isHealthy && (
                          <AlertCircle className="h-3 w-3 text-fz-amber" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {engine.authorityWeight && (
                          <span className="text-meta text-muted-foreground tabular-nums">
                            {(engine.authorityWeight * 100).toFixed(0)}%
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-body-sm tabular-nums font-medium",
                            engine.trend > 0
                              ? "text-fz-green"
                              : engine.trend < 0
                              ? "text-fz-red"
                              : "text-muted-foreground"
                          )}
                        >
                          {engine.trend > 0 ? "+" : ""}
                          {engine.trend}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-fz",
                            isHealthy ? "bg-fz-blue" : "bg-fz-amber"
                          )}
                          style={{ width: `${engine.visibility}%` }}
                        />
                      </div>
                      <span className="text-body-sm tabular-nums font-medium w-8 text-right">
                        {engine.visibility}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Insights Section */}
      <div className="fz-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-section-header text-foreground">
            Visibility Insights
          </h2>
          <button className="text-body-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors duration-fz">
            View details <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {displayScore >= 70 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-fz-green/5 border border-fz-green/10">
              <div className="h-1.5 w-1.5 rounded-full bg-fz-green mt-2 flex-shrink-0" />
              <div>
                <p className="text-body-sm text-foreground">Strong AI visibility</p>
                <p className="text-meta text-muted-foreground mt-0.5">
                  Brand well-represented in AI answers
                </p>
              </div>
            </div>
          )}

          {displayScore > 0 && displayScore < 40 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-fz-red/5 border border-fz-red/10">
              <div className="h-1.5 w-1.5 rounded-full bg-fz-red mt-2 flex-shrink-0" />
              <div>
                <p className="text-body-sm text-foreground">Low AI visibility</p>
                <p className="text-meta text-muted-foreground mt-0.5">
                  Consider optimizing content for AI search
                </p>
              </div>
            </div>
          )}

          {engineMetrics.some((e) => e.visibility < 30) && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-fz-amber/5 border border-fz-amber/10">
              <div className="h-1.5 w-1.5 rounded-full bg-fz-amber mt-2 flex-shrink-0" />
              <div>
                <p className="text-body-sm text-foreground">
                  Low visibility on{" "}
                  {engineMetrics
                    .filter((e) => e.visibility < 30)
                    .map((e) => ENGINE_NAMES[e.engine] || e.engine)
                    .slice(0, 2)
                    .join(", ")}
                </p>
                <p className="text-meta text-muted-foreground mt-0.5">
                  Focus optimization efforts here
                </p>
              </div>
            </div>
          )}

          {hasAuthorityData && weightedScore && overallScore && weightedScore > overallScore && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-fz-blue/5 border border-fz-blue/10">
              <div className="h-1.5 w-1.5 rounded-full bg-fz-blue mt-2 flex-shrink-0" />
              <div>
                <p className="text-body-sm text-foreground">Strong on high-authority engines</p>
                <p className="text-meta text-muted-foreground mt-0.5">
                  Weighted score exceeds raw by {(weightedScore - overallScore).toFixed(1)} pts
                </p>
              </div>
            </div>
          )}

          {shareOfVoice > 0 && shareOfVoice < 50 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
              <div>
                <p className="text-body-sm text-foreground">
                  Competitors have higher share of voice
                </p>
                <p className="text-meta text-muted-foreground mt-0.5">
                  Analyze their content strategy
                </p>
              </div>
            </div>
          )}

          {degradedEngines.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-fz-amber/5 border border-fz-amber/10">
              <div className="h-1.5 w-1.5 rounded-full bg-fz-amber mt-2 flex-shrink-0" />
              <div>
                <p className="text-body-sm text-foreground">
                  {degradedEngines.length} engine(s) have reduced reliability
                </p>
                <p className="text-meta text-muted-foreground mt-0.5">
                  Scores may vary until resolved
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
