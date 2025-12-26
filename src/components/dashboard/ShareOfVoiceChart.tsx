import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { PieChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ShareOfVoiceData {
  name: string;
  mentions: number;
  isYou?: boolean;
}

interface ShareOfVoiceChartProps {
  data?: ShareOfVoiceData[];
  brandName?: string;
  loading?: boolean;
}

const COLORS = [
  "hsl(199, 89%, 48%)", // cyan - your brand
  "hsl(0, 72%, 51%)",   // red
  "hsl(38, 92%, 50%)",  // yellow
  "hsl(280, 65%, 60%)", // purple
  "hsl(142, 76%, 45%)", // green
];

export function ShareOfVoiceChart({
  data,
  brandName = "Your Brand",
  loading,
}: ShareOfVoiceChartProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-16" />
        </div>
        <Skeleton className="h-4 w-64 mb-6" />
        <Skeleton className="h-[280px] w-full" />
      </div>
    );
  }

  // If no data, show empty state
  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-xl border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Share of Voice</h3>
        </div>
        <div className="h-[280px] flex items-center justify-center text-muted-foreground">
          No mention data yet. Analyze prompts to see share of voice.
        </div>
      </motion.div>
    );
  }

  const chartData = data;

  // Sort by mentions descending
  const sortedData = [...chartData].sort((a, b) => b.mentions - a.mentions);

  // Calculate total and percentages
  const total = sortedData.reduce((sum, item) => sum + item.mentions, 0);
  const yourBrand = sortedData.find((d) => d.isYou);
  const yourPercentage = total > 0 && yourBrand 
    ? Math.round((yourBrand.mentions / total) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="h-[350px] animate-pulse bg-secondary/30 rounded-lg" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Share of Voice</h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{yourPercentage}%</div>
          <div className="text-xs text-muted-foreground">Your share</div>
        </div>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        Brand mentions across all analyzed prompts
      </p>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(220, 20%, 18%)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }}
              tickFormatter={(value) => `${value}`}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(220, 10%, 55%)", fontSize: 12 }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 20%, 10%)",
                border: "1px solid hsl(220, 20%, 18%)",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              }}
              labelStyle={{ color: "hsl(210, 20%, 98%)" }}
              formatter={(value: number, name: string, props: any) => {
                const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                return [`${value} mentions (${pct}%)`, props.payload.isYou ? "Your Brand" : "Competitor"];
              }}
            />
            <Bar dataKey="mentions" radius={[0, 4, 4, 0]}>
              {sortedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isYou ? COLORS[0] : COLORS[(index % (COLORS.length - 1)) + 1]}
                  opacity={entry.isYou ? 1 : 0.7}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 justify-center">
        {sortedData.slice(0, 5).map((item, index) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{
                backgroundColor: item.isYou ? COLORS[0] : COLORS[(index % (COLORS.length - 1)) + 1],
              }}
            />
            <span className="text-xs text-muted-foreground">
              {item.name} ({total > 0 ? Math.round((item.mentions / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
