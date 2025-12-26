import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface VisibilityTrendPoint {
  date: string;
  value: number;
}

interface VisibilityChartProps {
  data?: VisibilityTrendPoint[];
  loading?: boolean;
}

// Fallback data when no data is available
const fallbackData: VisibilityTrendPoint[] = [
  { date: "Day 1", value: 0 },
  { date: "Day 2", value: 0 },
  { date: "Day 3", value: 0 },
  { date: "Day 4", value: 0 },
  { date: "Day 5", value: 0 },
  { date: "Day 6", value: 0 },
  { date: "Day 7", value: 0 },
];

export function VisibilityChart({ data, loading }: VisibilityChartProps) {
  const chartData = data && data.length > 0 ? data : fallbackData;
  
  // Calculate current score and change
  const currentScore = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;
  const previousScore = chartData.length > 1 ? chartData[chartData.length - 2].value : currentScore;
  const change = currentScore - previousScore;
  const changePercent = previousScore > 0 ? Math.round((change / previousScore) * 100) : 0;
  const isPositive = change >= 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-64 mb-6" />
        <Skeleton className="h-12 w-32 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Brand visibility</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Percentage of AI answers that mention your brand
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-foreground">{currentScore}%</span>
            {changePercent !== 0 && (
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium ${
                isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}>
                {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(changePercent)}%
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Visibility score</p>
        </div>
        <span className="text-sm text-muted-foreground">vs previous period</span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="visibilityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(160, 84%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(220, 20%, 18%)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 20%, 10%)",
                border: "1px solid hsl(220, 20%, 18%)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              }}
              labelStyle={{ color: "hsl(210, 20%, 98%)" }}
              itemStyle={{ color: "hsl(160, 84%, 45%)" }}
              formatter={(value: number) => [`${value}%`, "Visibility"]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(160, 84%, 45%)"
              strokeWidth={2}
              fill="url(#visibilityGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
