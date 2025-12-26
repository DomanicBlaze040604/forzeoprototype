import { useState } from "react";
import { motion } from "framer-motion";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  BarChart3,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrands } from "@/hooks/useBrands";
import { useTopicAnalysis } from "@/hooks/useTopicAnalysis";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function getSentimentColor(sentiment: string) {
  switch (sentiment) {
    case "positive":
      return "text-emerald-400 bg-emerald-400/10";
    case "negative":
      return "text-red-400 bg-red-400/10";
    default:
      return "text-yellow-400 bg-yellow-400/10";
  }
}

export default function Topic() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { isOpen } = useSidebar();
  const { activeBrand } = useBrands();
  const {
    topics,
    categoryData,
    loading,
    refetch,
    avgVisibility,
    totalPrompts,
    topPerforming,
  } = useTopicAnalysis(activeBrand?.id);

  const filteredTopics = topics.filter((topic) => {
    const matchesSearch = topic.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || topic.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const performanceByTopic = topics.slice(0, 6).map((t) => ({
    name: t.name.split(" ").slice(0, 2).join(" "),
    visibility: t.visibility,
    mentions: t.mentions,
  }));

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar />
      
      <main className={cn(
        "transition-all duration-200 ease-in-out",
        isOpen ? "pl-56" : "pl-0"
      )}>
        <Header title="Topic Analysis" breadcrumb={[activeBrand?.name || "FORZEO", "Topic"]} />
        
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
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{topics.length}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Topics Tracked</p>
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
                  <BarChart3 className="h-5 w-5 text-emerald-400" />
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
                  <Sparkles className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  {loading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">{totalPrompts}</p>
                  )}
                  <p className="text-sm text-muted-foreground">Total Prompts</p>
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
                    <Skeleton className="h-6 w-24" />
                  ) : (
                    <p className="text-lg font-bold text-foreground truncate">
                      {topPerforming?.name.split(" ").slice(0, 2).join(" ") || "N/A"}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">Top Performer</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Refresh Button */}
          <div className="mb-4 flex justify-end">
            <Button variant="outline" className="gap-2" onClick={() => refetch()}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {/* Charts Row */}
          <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Performance Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Visibility by Topic</CardTitle>
                  <CardDescription>Top performing topics by visibility score</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-72 w-full" />
                  ) : performanceByTopic.length === 0 ? (
                    <div className="h-72 flex items-center justify-center text-muted-foreground">
                      No topic data yet. Add prompts to see analysis.
                    </div>
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceByTopic}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                          <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar dataKey="visibility" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Category Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Category Distribution</CardTitle>
                  <CardDescription>Prompts by topic category</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-72 w-full" />
                  ) : categoryData.length === 0 ? (
                    <div className="h-72 flex items-center justify-center text-muted-foreground">
                      No categories yet. Tag your prompts to see distribution.
                    </div>
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Topics List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>All Topics</CardTitle>
                    <CardDescription>Detailed breakdown of all tracked topics</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search topics..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 pl-10"
                      />
                    </div>
                    <Button
                      variant={selectedCategory ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                      className="gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      {selectedCategory || "All Categories"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredTopics.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    {topics.length === 0
                      ? "No topics found. Add prompts to start tracking topics."
                      : "No topics match your search criteria"}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTopics.map((topic, index) => (
                      <motion.div
                        key={topic.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.02 * index }}
                        className="rounded-lg border border-border bg-secondary/20 p-4 hover:bg-secondary/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium text-foreground">{topic.name}</h4>
                              <Badge variant="outline" className="text-xs">{topic.category}</Badge>
                              <Badge className={cn("text-xs", getSentimentColor(topic.sentiment))}>
                                {topic.sentiment}
                              </Badge>
                            </div>
                            <div className="mt-2 flex items-center gap-6 text-sm text-muted-foreground">
                              <span>{topic.prompts} prompts</span>
                              <span>{topic.mentions} mentions</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 rounded-full bg-secondary">
                                <div
                                  className="h-full rounded-full bg-primary"
                                  style={{ width: `${topic.visibility}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-foreground">{topic.visibility}%</span>
                            </div>

                            <div className={cn(
                              "flex items-center gap-1 text-sm font-medium",
                              topic.trend >= 0 ? "text-emerald-400" : "text-red-400"
                            )}>
                              {topic.trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                              {topic.trend >= 0 ? "+" : ""}{topic.trend}%
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
