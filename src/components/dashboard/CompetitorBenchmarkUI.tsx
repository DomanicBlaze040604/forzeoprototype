import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Target,
  BarChart3,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface CompetitorMetrics {
  id: string;
  name: string;
  aiVisibilityScore: number;
  citationScore: number;
  authorityScore: number;
  promptSOV: number;
  totalMentions: number;
  trend: "up" | "down" | "stable";
  trendValue: number;
}

interface CompetitorBenchmarkUIProps {
  brandName: string;
  brandMetrics: CompetitorMetrics;
  competitors: CompetitorMetrics[];
  loading?: boolean;
  onRefresh?: () => void;
}

const COLORS = [
  "hsl(var(--primary))",
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

export function CompetitorBenchmarkUI({
  brandName,
  brandMetrics,
  competitors,
  loading = false,
  onRefresh,
}: CompetitorBenchmarkUIProps) {
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>(
    competitors.slice(0, 3).map((c) => c.id)
  );
  const [metricView, setMetricView] = useState<"radar" | "bar">("radar");

  const toggleCompetitor = (id: string) => {
    if (selectedCompetitors.includes(id)) {
      setSelectedCompetitors(selectedCompetitors.filter((c) => c !== id));
    } else if (selectedCompetitors.length < 5) {
      setSelectedCompetitors([...selectedCompetitors, id]);
    }
  };

  const selectedCompetitorData = useMemo(() => {
    return competitors.filter((c) => selectedCompetitors.includes(c.id));
  }, [competitors, selectedCompetitors]);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    const metrics = [
      { metric: "AI Visibility", key: "aiVisibilityScore" },
      { metric: "Citations", key: "citationScore" },
      { metric: "Authority", key: "authorityScore" },
      { metric: "Share of Voice", key: "promptSOV" },
    ];

    return metrics.map((m) => {
      const dataPoint: Record<string, any> = {
        metric: m.metric,
        [brandName]: brandMetrics[m.key as keyof CompetitorMetrics],
      };
      selectedCompetitorData.forEach((comp) => {
        dataPoint[comp.name] = comp[m.key as keyof CompetitorMetrics];
      });
      return dataPoint;
    });
  }, [brandName, brandMetrics, selectedCompetitorData]);

  // Prepare bar chart data
  const barData = useMemo(() => {
    return [
      { name: brandName, ...brandMetrics, isBrand: true },
      ...selectedCompetitorData.map((c) => ({ ...c, isBrand: false })),
    ];
  }, [brandName, brandMetrics, selectedCompetitorData]);

  // Calculate competitive gaps
  const competitiveGaps = useMemo(() => {
    const gaps: Array<{
      competitor: string;
      metric: string;
      gap: number;
      winning: boolean;
    }> = [];

    selectedCompetitorData.forEach((comp) => {
      const metrics = [
        { name: "AI Visibility", brand: brandMetrics.aiVisibilityScore, comp: comp.aiVisibilityScore },
        { name: "Citations", brand: brandMetrics.citationScore, comp: comp.citationScore },
        { name: "Authority", brand: brandMetrics.authorityScore, comp: comp.authorityScore },
        { name: "SOV", brand: brandMetrics.promptSOV, comp: comp.promptSOV },
      ];

      metrics.forEach((m) => {
        const gap = m.brand - m.comp;
        gaps.push({
          competitor: comp.name,
          metric: m.name,
          gap,
          winning: gap > 0,
        });
      });
    });

    return gaps;
  }, [brandMetrics, selectedCompetitorData]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-success" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[300px]" />
            <div className="grid grid-cols-4 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Competitor Benchmark
            </CardTitle>
            <CardDescription>
              Compare your brand against competitors across key metrics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={metricView} onValueChange={(v) => setMetricView(v as any)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="radar">Radar View</SelectItem>
                <SelectItem value="bar">Bar View</SelectItem>
              </SelectContent>
            </Select>
            {onRefresh && (
              <Button variant="ghost" size="icon" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Competitor Selector */}
        <div className="mt-4 flex flex-wrap gap-2">
          {competitors.map((comp) => (
            <div
              key={comp.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors",
                selectedCompetitors.includes(comp.id)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary/50"
              )}
              onClick={() => toggleCompetitor(comp.id)}
            >
              <Checkbox
                checked={selectedCompetitors.includes(comp.id)}
                onCheckedChange={() => toggleCompetitor(comp.id)}
              />
              <span className="text-sm font-medium">{comp.name}</span>
              {getTrendIcon(comp.trend)}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Chart */}
        <div className="h-[350px]">
          {metricView === "radar" ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="metric"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                />
                <Radar
                  name={brandName}
                  dataKey={brandName}
                  stroke={COLORS[0]}
                  fill={COLORS[0]}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                {selectedCompetitorData.map((comp, idx) => (
                  <Radar
                    key={comp.id}
                    name={comp.name}
                    dataKey={comp.name}
                    stroke={COLORS[(idx + 1) % COLORS.length]}
                    fill={COLORS[(idx + 1) % COLORS.length]}
                    fillOpacity={0.1}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="aiVisibilityScore" name="AI Visibility" fill={COLORS[0]} />
                <Bar dataKey="citationScore" name="Citations" fill={COLORS[1]} />
                <Bar dataKey="authorityScore" name="Authority" fill={COLORS[2]} />
                <Bar dataKey="promptSOV" name="SOV" fill={COLORS[3]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Metric Comparison Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg bg-secondary/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">AI Visibility</span>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {brandMetrics.aiVisibilityScore}%
            </p>
            <div className="mt-2 space-y-1">
              {selectedCompetitorData.slice(0, 2).map((comp) => {
                const diff = brandMetrics.aiVisibilityScore - comp.aiVisibilityScore;
                return (
                  <div key={comp.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">{comp.name}</span>
                    <span className={cn(diff > 0 ? "text-success" : "text-destructive")}>
                      {diff > 0 ? "+" : ""}{diff}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg bg-secondary/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Citation Score</span>
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {brandMetrics.citationScore}%
            </p>
            <div className="mt-2 space-y-1">
              {selectedCompetitorData.slice(0, 2).map((comp) => {
                const diff = brandMetrics.citationScore - comp.citationScore;
                return (
                  <div key={comp.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">{comp.name}</span>
                    <span className={cn(diff > 0 ? "text-success" : "text-destructive")}>
                      {diff > 0 ? "+" : ""}{diff}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg bg-secondary/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Authority</span>
              <Trophy className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {brandMetrics.authorityScore}%
            </p>
            <div className="mt-2 space-y-1">
              {selectedCompetitorData.slice(0, 2).map((comp) => {
                const diff = brandMetrics.authorityScore - comp.authorityScore;
                return (
                  <div key={comp.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">{comp.name}</span>
                    <span className={cn(diff > 0 ? "text-success" : "text-destructive")}>
                      {diff > 0 ? "+" : ""}{diff}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg bg-secondary/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Share of Voice</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {brandMetrics.promptSOV}%
            </p>
            <div className="mt-2 space-y-1">
              {selectedCompetitorData.slice(0, 2).map((comp) => {
                const diff = brandMetrics.promptSOV - comp.promptSOV;
                return (
                  <div key={comp.id} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">{comp.name}</span>
                    <span className={cn(diff > 0 ? "text-success" : "text-destructive")}>
                      {diff > 0 ? "+" : ""}{diff}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Competitive Gap Analysis */}
        <div className="rounded-lg border border-border p-4">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Competitive Gap Analysis
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {/* Winning Areas */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <ArrowUp className="h-3 w-3 text-success" />
                Areas You're Winning
              </p>
              <div className="space-y-2">
                {competitiveGaps
                  .filter((g) => g.winning && g.gap > 5)
                  .slice(0, 4)
                  .map((gap, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-success/10 p-2"
                    >
                      <span className="text-xs text-foreground">
                        {gap.metric} vs {gap.competitor}
                      </span>
                      <Badge variant="outline" className="text-success border-success/30">
                        +{gap.gap.toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                {competitiveGaps.filter((g) => g.winning && g.gap > 5).length === 0 && (
                  <p className="text-xs text-muted-foreground">No significant leads</p>
                )}
              </div>
            </div>

            {/* Areas to Improve */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <ArrowDown className="h-3 w-3 text-destructive" />
                Areas to Improve
              </p>
              <div className="space-y-2">
                {competitiveGaps
                  .filter((g) => !g.winning && Math.abs(g.gap) > 5)
                  .slice(0, 4)
                  .map((gap, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-destructive/10 p-2"
                    >
                      <span className="text-xs text-foreground">
                        {gap.metric} vs {gap.competitor}
                      </span>
                      <Badge variant="outline" className="text-destructive border-destructive/30">
                        {gap.gap.toFixed(0)}%
                      </Badge>
                    </div>
                  ))}
                {competitiveGaps.filter((g) => !g.winning && Math.abs(g.gap) > 5).length === 0 && (
                  <p className="text-xs text-muted-foreground">No significant gaps</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
