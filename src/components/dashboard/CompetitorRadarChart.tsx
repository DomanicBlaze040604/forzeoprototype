import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Eye, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface RadarDataPoint {
  metric: string;
  brand: number;
  competitors: number;
  fullMark: number;
  description?: string;
  trend?: number;
}

interface CompetitorRadarChartProps {
  brandName?: string;
  data?: RadarDataPoint[];
  loading?: boolean;
  onMetricClick?: (metric: string) => void;
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  const brandValue = payload.find((p: any) => p.dataKey === "brand")?.value || 0;
  const competitorValue = payload.find((p: any) => p.dataKey === "competitors")?.value || 0;
  const diff = brandValue - competitorValue;

  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Your Brand</span>
          <span className="text-sm font-medium text-fz-blue">{brandValue}%</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">Competitors</span>
          <span className="text-sm font-medium text-fz-red">{competitorValue}%</span>
        </div>
        <div className="pt-1.5 border-t border-border">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">Gap</span>
            <span className={cn(
              "text-sm font-medium flex items-center gap-1",
              diff > 0 ? "text-fz-green" : diff < 0 ? "text-fz-red" : "text-muted-foreground"
            )}>
              {diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              {diff > 0 ? "+" : ""}{diff}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompetitorRadarChart({
  brandName = "FORZEO",
  data,
  loading,
  onMetricClick,
}: CompetitorRadarChartProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="h-[350px] animate-pulse bg-secondary/30 rounded-lg" />
      </div>
    );
  }

  // If no data provided, show empty state
  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="rounded-xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Competitive Dominance
          </h3>
        </div>
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          No comparison data yet. Analyze prompts to see competitive metrics.
        </div>
      </motion.div>
    );
  }

  const chartData = data;

  // Calculate overall dominance score
  const avgBrand = chartData.reduce((sum, d) => sum + d.brand, 0) / chartData.length;
  const avgCompetitor = chartData.reduce((sum, d) => sum + d.competitors, 0) / chartData.length;
  const dominanceScore = Math.round(avgBrand - avgCompetitor);

  const handleMetricClick = (metric: string) => {
    setSelectedMetric(selectedMetric === metric ? null : metric);
    onMetricClick?.(metric);
  };

  // Get selected metric details
  const selectedData = selectedMetric 
    ? chartData.find(d => d.metric === selectedMetric) 
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Competitive Dominance
          </h3>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          dominanceScore > 0 
            ? "bg-fz-green/10 text-fz-green" 
            : dominanceScore < 0 
            ? "bg-fz-red/10 text-fz-red"
            : "bg-secondary text-muted-foreground"
        )}>
          {dominanceScore > 0 ? <TrendingUp className="h-3 w-3" /> : dominanceScore < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {dominanceScore > 0 ? "+" : ""}{dominanceScore}% vs competitors
        </div>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        Click on metrics to see detailed breakdown
      </p>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart 
            cx="50%" 
            cy="50%" 
            outerRadius="70%" 
            data={chartData}
            onMouseMove={(e: any) => {
              if (e?.activeLabel) {
                setHoveredMetric(e.activeLabel);
              }
            }}
            onMouseLeave={() => setHoveredMetric(null)}
          >
            <PolarGrid
              stroke="hsl(var(--border))"
              strokeDasharray="3 3"
            />
            <PolarAngleAxis
              dataKey="metric"
              tick={({ payload, x, y, textAnchor, ...rest }) => (
                <text
                  {...rest}
                  x={x}
                  y={y}
                  textAnchor={textAnchor}
                  fill={hoveredMetric === payload.value || selectedMetric === payload.value 
                    ? "hsl(var(--foreground))" 
                    : "hsl(var(--muted-foreground))"}
                  fontSize={11}
                  fontWeight={selectedMetric === payload.value ? 600 : 400}
                  className="cursor-pointer transition-colors"
                  onClick={() => handleMetricClick(payload.value)}
                >
                  {payload.value}
                </text>
              )}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              tickCount={5}
            />
            <Radar
              name={brandName}
              dataKey="brand"
              stroke="hsl(199, 89%, 48%)"
              fill="hsl(199, 89%, 48%)"
              fillOpacity={0.4}
              strokeWidth={2}
              animationDuration={500}
              dot={{
                r: 4,
                fill: "hsl(199, 89%, 48%)",
                strokeWidth: 0,
              }}
              activeDot={{
                r: 6,
                fill: "hsl(199, 89%, 48%)",
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
            />
            <Radar
              name="Key Competitors"
              dataKey="competitors"
              stroke="hsl(0, 72%, 51%)"
              fill="hsl(0, 72%, 51%)"
              fillOpacity={0.2}
              strokeWidth={2}
              animationDuration={500}
              dot={{
                r: 4,
                fill: "hsl(0, 72%, 51%)",
                strokeWidth: 0,
              }}
              activeDot={{
                r: 6,
                fill: "hsl(0, 72%, 51%)",
                stroke: "hsl(var(--background))",
                strokeWidth: 2,
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: "20px",
              }}
              formatter={(value) => (
                <span className="text-sm text-foreground">{value}</span>
              )}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Metric Details Panel */}
      <AnimatePresence>
        {selectedData && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-border overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  {selectedData.metric}
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedData.description || `Your performance in ${selectedData.metric.toLowerCase()} compared to competitors`}
                </p>
              </div>
              <button
                onClick={() => setSelectedMetric(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Your Score</p>
                <p className="text-lg font-semibold text-fz-blue">{selectedData.brand}%</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Competitors</p>
                <p className="text-lg font-semibold text-fz-red">{selectedData.competitors}%</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Advantage</p>
                <p className={cn(
                  "text-lg font-semibold",
                  selectedData.brand > selectedData.competitors ? "text-fz-green" : "text-fz-red"
                )}>
                  {selectedData.brand > selectedData.competitors ? "+" : ""}
                  {selectedData.brand - selectedData.competitors}%
                </p>
              </div>
            </div>

            {selectedData.trend !== undefined && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                {selectedData.trend > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-fz-green" />
                ) : selectedData.trend < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5 text-fz-red" />
                ) : (
                  <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className={cn(
                  selectedData.trend > 0 ? "text-fz-green" : selectedData.trend < 0 ? "text-fz-red" : "text-muted-foreground"
                )}>
                  {selectedData.trend > 0 ? "+" : ""}{selectedData.trend}% from last period
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-border grid grid-cols-4 gap-2">
        {chartData.map((item) => {
          const diff = item.brand - item.competitors;
          return (
            <button
              key={item.metric}
              onClick={() => handleMetricClick(item.metric)}
              className={cn(
                "p-2 rounded-lg text-center transition-colors",
                selectedMetric === item.metric 
                  ? "bg-primary/10 border border-primary/20" 
                  : "bg-secondary/50 hover:bg-secondary"
              )}
            >
              <p className="text-[10px] text-muted-foreground truncate">{item.metric}</p>
              <p className={cn(
                "text-xs font-medium",
                diff > 0 ? "text-fz-green" : diff < 0 ? "text-fz-red" : "text-muted-foreground"
              )}>
                {diff > 0 ? "+" : ""}{diff}%
              </p>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
