import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CompetitorDataPoint {
  date: string;
  yourBrand: number;
  [competitor: string]: string | number;
}

interface CompetitorInfo {
  name: string;
  mentions: number;
  avgRank: number;
}

interface CompetitorComparisonChartProps {
  brandName?: string;
  data?: CompetitorDataPoint[];
  competitors?: string[];
  competitorData?: CompetitorInfo[];
}

// Generate demo data if none provided
const generateDemoData = (brandName: string, competitors: string[]): CompetitorDataPoint[] => {
  const days = ["Jan 15", "Jan 22", "Jan 29", "Feb 5", "Feb 12", "Feb 19", "Feb 26"];
  
  return days.map((date, index) => {
    const baseValue = 45 + Math.random() * 20;
    const dataPoint: CompetitorDataPoint = {
      date,
      yourBrand: Math.round(baseValue + index * 2 + Math.random() * 10),
    };
    
    competitors.forEach((comp, compIndex) => {
      const compBase = 35 + compIndex * 5 + Math.random() * 15;
      dataPoint[comp] = Math.round(compBase + index * (1 + Math.random()) + Math.random() * 8);
    });
    
    return dataPoint;
  });
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function CompetitorComparisonChart({
  brandName = "Your Brand",
  data,
  competitors = ["Salesforce", "HubSpot", "Zoho"],
  competitorData,
}: CompetitorComparisonChartProps) {
  const chartData = data || generateDemoData(brandName, competitors);
  
  // Calculate trend
  const latestYourBrand = chartData[chartData.length - 1]?.yourBrand || 0;
  const previousYourBrand = chartData[chartData.length - 2]?.yourBrand || latestYourBrand;
  const trend = latestYourBrand - previousYourBrand;
  const trendPercentage = previousYourBrand > 0 ? ((trend / previousYourBrand) * 100).toFixed(1) : "0";

  // Use competitor data if provided
  const displayCompetitors = competitorData 
    ? competitorData.map(c => c.name).slice(0, 4)
    : competitors;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">
                Brand vs Competitors
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Visibility score comparison over time
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {trend >= 0 ? (
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">+{trendPercentage}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-rose-400">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-medium">{trendPercentage}%</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    name === "yourBrand" ? brandName : name,
                  ]}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "20px" }}
                  formatter={(value) => (value === "yourBrand" ? brandName : value)}
                />
                <Line
                  type="monotone"
                  dataKey="yourBrand"
                  name="yourBrand"
                  stroke={COLORS[0]}
                  strokeWidth={3}
                  dot={{ fill: COLORS[0], strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2 }}
                />
                {displayCompetitors.map((comp, index) => (
                  <Line
                    key={comp}
                    type="monotone"
                    dataKey={comp}
                    name={comp}
                    stroke={COLORS[(index + 1) % COLORS.length]}
                    strokeWidth={2}
                    strokeDasharray={index === 0 ? undefined : "5 5"}
                    dot={{ fill: COLORS[(index + 1) % COLORS.length], strokeWidth: 1, r: 3 }}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                    opacity={0.8}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend summary - use real data if available */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-secondary/30 p-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[0] }} />
                <span className="text-xs text-muted-foreground">{brandName}</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">{latestYourBrand}%</p>
            </div>
            {competitorData ? (
              competitorData.slice(0, 3).map((comp, index) => (
                <div key={comp.name} className="rounded-lg bg-secondary/30 p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[(index + 1) % COLORS.length] }}
                    />
                    <span className="text-xs text-muted-foreground truncate">{comp.name}</span>
                  </div>
                  <p className="mt-1 text-lg font-bold text-foreground">{comp.mentions}</p>
                  <p className="text-xs text-muted-foreground">mentions</p>
                </div>
              ))
            ) : (
              displayCompetitors.slice(0, 3).map((comp, index) => {
                const compValue = chartData[chartData.length - 1]?.[comp] || 0;
                return (
                  <div key={comp} className="rounded-lg bg-secondary/30 p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[(index + 1) % COLORS.length] }}
                      />
                      <span className="text-xs text-muted-foreground truncate">{comp}</span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-foreground">{compValue}%</p>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
