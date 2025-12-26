import { useState } from "react";
import { motion } from "framer-motion";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  RefreshCw,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrands } from "@/hooks/useBrands";
import { useModelAnalytics } from "@/hooks/useModelAnalytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

const featureSupport = [
  { feature: "Brand Mentions", ChatGPT: true, Perplexity: true, Gemini: true, Claude: true },
  { feature: "Citation Links", ChatGPT: true, Perplexity: true, Gemini: false, Claude: true },
  { feature: "Ranking Position", ChatGPT: true, Perplexity: true, Gemini: true, Claude: true },
  { feature: "Sentiment Analysis", ChatGPT: true, Perplexity: true, Gemini: true, Claude: true },
  { feature: "Real-time Data", ChatGPT: false, Perplexity: true, Gemini: true, Claude: false },
  { feature: "Source Verification", ChatGPT: false, Perplexity: true, Gemini: false, Claude: false },
];

const LINE_COLORS = [
  "hsl(142, 76%, 36%)", // green
  "hsl(280, 65%, 60%)", // purple
  "hsl(48, 96%, 53%)",  // yellow
  "hsl(25, 95%, 53%)",  // orange
];

function getSentimentColor(sentiment: string) {
  switch (sentiment) {
    case "positive":
      return "text-emerald-400";
    case "negative":
      return "text-red-400";
    default:
      return "text-yellow-400";
  }
}

export default function Model() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const { activeBrand } = useBrands();
  const { isOpen } = useSidebar();
  const {
    modelPerformance,
    trendData,
    loading,
    refetch,
    avgVisibility,
    bestPerforming,
    totalMentions,
    modelCount,
    trendModels
  } = useModelAnalytics(activeBrand?.id);

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar />
      
      <main className={cn(
        "transition-all duration-200 ease-in-out",
        isOpen ? "pl-56" : "pl-0"
      )}>
        <Header title="Model Analytics" breadcrumb={[activeBrand?.name || "FORZEO", "Model"]} />
        
        <div className="p-6">
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{modelCount}</p>
                  )}
                  <p className="text-sm text-muted-foreground">AI Models Tracked</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                  <Activity className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{avgVisibility}%</p>
                  )}
                  <p className="text-sm text-muted-foreground">Avg. Visibility</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  {loading ? (
                    <Skeleton className="h-6 w-6 rounded-full" />
                  ) : (
                    <span className="text-xl">{bestPerforming?.icon || "⚪"}</span>
                  )}
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-6 w-24" />
                  ) : (
                    <p className="text-lg font-bold text-foreground">
                      {bestPerforming?.model || "N/A"}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">Best Performing</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <TrendingUp className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{totalMentions}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total Mentions</p>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="mb-4 flex justify-end">
            <Button variant="outline" className="gap-2" onClick={() => refetch()}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="features">Feature Support</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Model Cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <h3 className="text-lg font-semibold text-foreground">Model Performance</h3>
                  {loading ? (
                    [...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))
                  ) : modelPerformance.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border border-border rounded-xl">
                      No model data available. Analyze prompts to see performance.
                    </div>
                  ) : (
                    modelPerformance.map((model, index) => (
                      <motion.div
                        key={model.model}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * index }}
                        className={cn(
                          "rounded-xl border border-border bg-card p-4 transition-all cursor-pointer hover:border-primary/50",
                          selectedModel === model.model && "border-primary bg-primary/5"
                        )}
                        onClick={() => setSelectedModel(model.model === selectedModel ? null : model.model)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{model.icon}</span>
                            <div>
                              <p className="font-medium text-foreground">{model.model}</p>
                              <p className="text-xs text-muted-foreground">Last checked: {model.lastChecked}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-foreground">{model.visibility}%</span>
                              <div className={cn(
                                "flex items-center gap-0.5 text-sm",
                                model.trend >= 0 ? "text-emerald-400" : "text-red-400"
                              )}>
                                {model.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                {Math.abs(model.trend)}%
                              </div>
                            </div>
                            <Badge variant="secondary" className={cn("text-xs mt-1", getSentimentColor(model.sentiment))}>
                              {model.sentiment}
                            </Badge>
                          </div>
                        </div>

                        {selectedModel === model.model && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4"
                          >
                            <div>
                              <p className="text-xs text-muted-foreground">Mentions</p>
                              <p className="text-lg font-bold text-foreground">{model.mentions}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Avg Rank</p>
                              <p className="text-lg font-bold text-foreground">#{model.rank}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Status</p>
                              <p className="text-lg font-bold text-emerald-400">Active</p>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    ))
                  )}
                </motion.div>

                {/* Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Visibility by Model</CardTitle>
                      <CardDescription>Current visibility scores across AI engines</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <Skeleton className="h-80 w-full" />
                      ) : modelPerformance.length === 0 ? (
                        <div className="h-80 flex items-center justify-center text-muted-foreground">
                          No data available yet.
                        </div>
                      ) : (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={modelPerformance} layout="vertical" margin={{ left: 80 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis dataKey="model" type="category" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                }}
                              />
                              <Bar dataKey="visibility" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="trends">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Visibility Trends (7 Days)</CardTitle>
                    <CardDescription>Track how your visibility changes across models over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <Skeleton className="h-96 w-full" />
                    ) : (
                      <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                            />
                            <Legend />
                            {trendModels.map((model, index) => (
                              <Line
                                key={model}
                                type="monotone"
                                dataKey={model}
                                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="features">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Feature Support Matrix</CardTitle>
                    <CardDescription>Compare capabilities across AI models</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Feature</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">ChatGPT</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Perplexity</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Gemini</th>
                            <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Claude</th>
                          </tr>
                        </thead>
                        <tbody>
                          {featureSupport.map((row) => (
                            <tr key={row.feature} className="border-b border-border last:border-0">
                              <td className="px-4 py-3 text-sm font-medium text-foreground">{row.feature}</td>
                              <td className="px-4 py-3 text-center">
                                {row.ChatGPT ? (
                                  <Check className="h-5 w-5 text-emerald-400 mx-auto" />
                                ) : (
                                  <X className="h-5 w-5 text-muted-foreground mx-auto" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {row.Perplexity ? (
                                  <Check className="h-5 w-5 text-emerald-400 mx-auto" />
                                ) : (
                                  <X className="h-5 w-5 text-muted-foreground mx-auto" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {row.Gemini ? (
                                  <Check className="h-5 w-5 text-emerald-400 mx-auto" />
                                ) : (
                                  <X className="h-5 w-5 text-muted-foreground mx-auto" />
                                )}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {row.Claude ? (
                                  <Check className="h-5 w-5 text-emerald-400 mx-auto" />
                                ) : (
                                  <X className="h-5 w-5 text-muted-foreground mx-auto" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
