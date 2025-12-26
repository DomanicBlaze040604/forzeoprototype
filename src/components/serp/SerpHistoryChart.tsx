import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useSerpHistory } from "@/hooks/useSerpHistory";

interface SerpHistoryChartProps {
  promptId?: string;
  brandId?: string;
  brandName: string;
}

export function SerpHistoryChart({ promptId, brandId, brandName }: SerpHistoryChartProps) {
  const { history, loading, getPositionTrend, getVisibilityTrend } = useSerpHistory(promptId, brandId);

  const positionData = useMemo(() => getPositionTrend(), [getPositionTrend]);
  const visibilityData = useMemo(() => getVisibilityTrend(), [getVisibilityTrend]);

  // Calculate trend
  const trend = useMemo(() => {
    if (positionData.length < 2) return null;
    const latest = positionData[positionData.length - 1]?.position || 0;
    const previous = positionData[positionData.length - 2]?.position || 0;
    
    if (latest < previous) return "improving"; // Lower position number = better
    if (latest > previous) return "declining";
    return "stable";
  }, [positionData]);

  const currentPosition = positionData[positionData.length - 1]?.position;
  const positionChange = positionData.length >= 2 
    ? (positionData[positionData.length - 2]?.position || 0) - (currentPosition || 0)
    : 0;

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="animate-pulse h-48 bg-secondary/30 rounded" />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-foreground">SERP Position History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No SERP history yet. Analyze prompts to start tracking positions.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-foreground">
            SERP Position History for {brandName}
          </CardTitle>
          {trend && (
            <div className="flex items-center gap-2">
              {trend === "improving" && (
                <div className="flex items-center gap-1 text-success text-xs">
                  <TrendingUp className="h-4 w-4" />
                  <span>+{positionChange} positions</span>
                </div>
              )}
              {trend === "declining" && (
                <div className="flex items-center gap-1 text-destructive text-xs">
                  <TrendingDown className="h-4 w-4" />
                  <span>{positionChange} positions</span>
                </div>
              )}
              {trend === "stable" && (
                <div className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Minus className="h-4 w-4" />
                  <span>Stable</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {positionData.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={positionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                />
                <YAxis 
                  reversed
                  domain={[1, 'auto']}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                  label={{ 
                    value: 'Position', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" }
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`#${value}`, "Position"]}
                />
                <Line
                  type="monotone"
                  dataKey="position"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No position data available</p>
          </div>
        )}

        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center p-2 rounded-lg bg-secondary/30">
            <p className="text-xs text-muted-foreground">Current Position</p>
            <p className="text-lg font-semibold text-foreground">
              {currentPosition ? `#${currentPosition}` : "—"}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-secondary/30">
            <p className="text-xs text-muted-foreground">SERP Appearances</p>
            <p className="text-lg font-semibold text-foreground">
              {history.filter((h) => h.brand_in_serp).length}/{history.length}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-secondary/30">
            <p className="text-xs text-muted-foreground">AI Overview Mentions</p>
            <p className="text-lg font-semibold text-foreground">
              {history.filter((h) => h.ai_overview_mentioned).length}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
