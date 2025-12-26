import { useState } from "react";
import { motion } from "framer-motion";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Search,
  RefreshCw,
  Cpu,
  Globe,
  Bot,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrands } from "@/hooks/useBrands";
import { useIndustryBenchmark } from "@/hooks/useIndustryBenchmark";
import { ExportMenu } from "@/components/dashboard/ExportMenu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

const topCategories = [
  { name: "CRM Software", visibility: 78, trend: 5, prompts: 45 },
  { name: "Sales Automation", visibility: 72, trend: -3, prompts: 32 },
  { name: "Customer Management", visibility: 68, trend: 8, prompts: 28 },
  { name: "Enterprise Solutions", visibility: 65, trend: 2, prompts: 22 },
  { name: "Lead Generation", visibility: 62, trend: -1, prompts: 18 },
];

export default function Industry() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("crm-software");
  const { isOpen } = useSidebar();
  const { activeBrand } = useBrands();
  const { 
    benchmarkData, 
    engineData, 
    radarData, 
    loading, 
    refetch,
    brandRank,
    totalCompetitors,
    gapToLeader,
    leader,
    promptSov,
    leaderSov
  } = useIndustryBenchmark(activeBrand?.id);

  // Prepare chart data
  const chartBenchmarks = benchmarkData.map(b => ({
    brand: b.entity_name,
    avsScore: Math.round(b.avs_score || 0),
    citationScore: Math.round(b.citation_score || 0),
    authorityScore: Math.round(b.authority_score || 0),
    promptSov: Math.round(b.prompt_sov || 0),
    isYou: b.is_brand
  }));

  // Prepare radar chart data with brand name
  const brandName = activeBrand?.name || "Your Brand";
  const radarChartData = radarData.map(r => ({
    metric: r.metric,
    [brandName]: Math.round(r.brand || 0),
    "Industry Avg": Math.round(r.industryAvg || 0)
  }));

  // Filter benchmarks based on search
  const filteredBenchmarks = chartBenchmarks.filter(b =>
    b.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar />
      
      <main className={cn(
        "transition-all duration-200 ease-in-out",
        isOpen ? "pl-56" : "pl-0"
      )}>
        <Header title="Industry Benchmark" breadcrumb={[activeBrand?.name || "FORZEO", "Industry"]} />
        
        <div className="p-6">
          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select Industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crm-software">CRM Software</SelectItem>
                  <SelectItem value="marketing-automation">Marketing Automation</SelectItem>
                  <SelectItem value="sales-tools">Sales Tools</SelectItem>
                  <SelectItem value="customer-service">Customer Service</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search competitors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" className="gap-2" onClick={() => refetch()}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
              <ExportMenu brandId={activeBrand?.id} />
            </div>
          </motion.div>

          {/* Key Metrics Row */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Industry Rank</p>
                  {loading ? (
                    <Skeleton className="h-9 w-16 mt-1" />
                  ) : (
                    <p className="mt-1 text-3xl font-bold text-foreground">
                      #{brandRank || "-"}
                    </p>
                  )}
                </div>
                {brandRank <= 3 ? (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Top 3</span>
                  </div>
                ) : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Out of {totalCompetitors} competitors
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Prompt Share of Voice</p>
                  {loading ? (
                    <Skeleton className="h-9 w-16 mt-1" />
                  ) : (
                    <p className="mt-1 text-3xl font-bold text-foreground">
                      {Math.round(promptSov)}%
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                vs. {Math.round(leaderSov)}% leader
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Gap to Leader</p>
                  {loading ? (
                    <Skeleton className="h-9 w-16 mt-1" />
                  ) : (
                    <p className="mt-1 text-3xl font-bold text-foreground">
                      {gapToLeader}pts
                    </p>
                  )}
                </div>
                {gapToLeader > 0 ? (
                  <div className="flex items-center gap-1 text-red-400">
                    <TrendingDown className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {leader?.entity_name || "No leader"} leads
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Engine Coverage</p>
                  {loading ? (
                    <Skeleton className="h-9 w-16 mt-1" />
                  ) : (
                    <p className="mt-1 text-3xl font-bold text-foreground">
                      {engineData.length}/{engineData.length || 5}
                    </p>
                  )}
                </div>
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">All tracked AI engines</p>
            </motion.div>
          </div>

          <Tabs defaultValue="benchmark" className="space-y-6">
            <TabsList>
              <TabsTrigger value="benchmark" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Benchmark
              </TabsTrigger>
              <TabsTrigger value="engines" className="gap-2">
                <Cpu className="h-4 w-4" />
                By Engine
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <Globe className="h-4 w-4" />
                Categories
              </TabsTrigger>
            </TabsList>

            <TabsContent value="benchmark">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Competitor Comparison Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>AI Visibility Score by Brand</CardTitle>
                      <CardDescription>Compare your visibility against competitors</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="h-80 flex items-center justify-center">
                          <Skeleton className="h-full w-full" />
                        </div>
                      ) : chartBenchmarks.length === 0 ? (
                        <div className="h-80 flex items-center justify-center text-muted-foreground">
                          No benchmark data available. Add competitors to see comparisons.
                        </div>
                      ) : (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={chartBenchmarks}
                              layout="vertical"
                              margin={{ left: 80 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                              <YAxis dataKey="brand" type="category" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "hsl(var(--card))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "8px",
                                }}
                              />
                              <Bar
                                dataKey="avsScore"
                                fill="hsl(var(--primary))"
                                radius={[0, 4, 4, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Radar Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance vs Industry</CardTitle>
                      <CardDescription>Multi-dimensional comparison</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="h-80 flex items-center justify-center">
                          <Skeleton className="h-full w-full" />
                        </div>
                      ) : radarChartData.length === 0 ? (
                        <div className="h-80 flex items-center justify-center text-muted-foreground">
                          No data available yet.
                        </div>
                      ) : (
                        <div className="h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarChartData}>
                              <PolarGrid stroke="hsl(var(--border))" />
                              <PolarAngleAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                              <Radar name={brandName} dataKey={brandName} stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                              <Radar name="Industry Avg" dataKey="Industry Avg" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.2} />
                              <Legend />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Competitor Table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6"
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Competitor Leaderboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : filteredBenchmarks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No competitors found. Add competitors from the Dashboard to see benchmarks.
                      </div>
                    ) : (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-secondary/30">
                              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Rank</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Brand</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">AVS Score</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Citation Score</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Authority</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Prompt SOV</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredBenchmarks
                              .sort((a, b) => b.avsScore - a.avsScore)
                              .map((brand, index) => (
                                <tr
                                  key={brand.brand}
                                  className={cn(
                                    "border-t border-border transition-colors",
                                    brand.isYou ? "bg-primary/5" : "hover:bg-secondary/20"
                                  )}
                                >
                                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                                    #{index + 1}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-foreground">{brand.brand}</span>
                                      {brand.isYou && <Badge variant="secondary">You</Badge>}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="h-2 w-16 rounded-full bg-secondary">
                                        <div
                                          className="h-full rounded-full bg-primary"
                                          style={{ width: `${brand.avsScore}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium text-foreground">{brand.avsScore}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-foreground">{brand.citationScore}</td>
                                  <td className="px-4 py-3 text-sm text-foreground">{brand.authorityScore}</td>
                                  <td className="px-4 py-3 text-sm text-foreground">{brand.promptSov}%</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="engines">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      Performance by AI Engine
                    </CardTitle>
                    <CardDescription>Compare your visibility across different AI platforms</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-80 flex items-center justify-center">
                        <Skeleton className="h-full w-full" />
                      </div>
                    ) : engineData.length === 0 ? (
                      <div className="h-80 flex items-center justify-center text-muted-foreground">
                        No engine data available. Analyze prompts to see performance by AI engine.
                      </div>
                    ) : (
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={engineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="engine" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                            <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                            />
                            <Legend />
                            <Bar dataKey="yourScore" name="Your Score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="industryAvg" name="Industry Avg" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="topCompetitor" name="Top Competitor" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="categories">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Top Performing Categories
                    </CardTitle>
                    <CardDescription>Your visibility by topic category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {topCategories.map((category, index) => (
                        <motion.div
                          key={category.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 * index }}
                          className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/10"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                            <div>
                              <p className="font-medium text-foreground">{category.name}</p>
                              <p className="text-sm text-muted-foreground">{category.prompts} prompts tracked</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 rounded-full bg-secondary">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${category.visibility}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium text-foreground w-12 text-right">
                                  {category.visibility}%
                                </span>
                              </div>
                            </div>
                            <div className={cn(
                              "flex items-center gap-1 text-sm min-w-16",
                              category.trend >= 0 ? "text-emerald-400" : "text-red-400"
                            )}>
                              {category.trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                              {category.trend >= 0 ? "+" : ""}{category.trend}%
                            </div>
                          </div>
                        </motion.div>
                      ))}
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
