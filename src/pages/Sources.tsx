import { useState } from "react";
import { motion } from "framer-motion";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useGenerateReport } from "@/hooks/useGenerateReport";
import { useSources } from "@/hooks/useSources";
import { CitationVerifier } from "@/components/citations/CitationVerifier";
import {
  Search,
  ChevronDown,
  ExternalLink,
  Globe,
  Shield,
  ShieldCheck,
  ShieldX,
  TrendingUp,
  Download,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

const typeFilters = ["All Types", "UGC", "You", "Reference", "Competitor", "Editorial", "Review"];

function getTrustColor(score: number): string {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

export default function Sources() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All Types");
  const { isOpen } = useSidebar();
  const { exportToCsv } = useGenerateReport();
  const {
    sources,
    loading,
    refetch,
    chartData,
    pieData,
    totalSources,
    verifiedCount,
    yourSources,
    competitorSources
  } = useSources();

  const filteredSources = sources.filter((source) => {
    const matchesSearch = source.domain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "All Types" || source.type.label === selectedType;
    return matchesSearch && matchesType;
  });

  const handleExportCsv = () => {
    exportToCsv(
      filteredSources.map((s) => ({
        Domain: s.domain,
        Type: s.type.label,
        "Usage %": s.used,
        "Avg Citations": s.avgCitations,
        "Trust Score": s.trustScore,
        Verified: s.verified ? "Yes" : "No",
      })),
      "citation-sources"
    );
  };

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar />
      
      <main className={cn(
        "transition-all duration-200 ease-in-out",
        isOpen ? "pl-56" : "pl-0"
      )}>
        <Header title="Citation Sources" breadcrumb={["FORZEO", "Sources"]} />
        
        <div className="p-6">
          <Tabs defaultValue="sources" className="space-y-6">
            <TabsList>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="verify" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Verify Citations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="verify">
              <CitationVerifier />
            </TabsContent>

            <TabsContent value="sources">
              {/* Filters & Actions */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search Sources"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="relative">
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="appearance-none rounded-lg border border-border bg-card px-4 py-2 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {typeFilters.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => refetch()}>
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    Refresh
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </motion.div>

              {/* Charts Row */}
              <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Citation Frequency Chart */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Citation Frequency</h3>
                  {loading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : chartData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No source data available yet.
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar dataKey="citations" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </motion.div>

                {/* Source Type Distribution */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Source Type Distribution</h3>
                  {loading ? (
                    <Skeleton className="h-64 w-full" />
                  ) : pieData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      No source data available yet.
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieData.map((entry, index) => (
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
                </motion.div>
              </div>

              {/* Sources Table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {loading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : filteredSources.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    {sources.length === 0 
                      ? "No sources tracked yet. Citation sources will appear here after analyzing prompts."
                      : "No sources match your search criteria."}
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Domain</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Type</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Usage</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Avg. Citations</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Trust Score</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSources.map((source, index) => (
                        <motion.tr
                          key={source.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.02 * index }}
                          className="border-b border-border last:border-0 transition-colors hover:bg-secondary/20"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{source.favicon}</span>
                              <span className="text-sm font-medium text-foreground">{source.domain}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary" className={cn("text-xs", source.type.color)}>
                              {source.type.label}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-20 rounded-full bg-secondary overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${source.used}%` }} />
                              </div>
                              <span className="text-sm font-medium text-foreground">{source.used}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-foreground">{source.avgCitations}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <TrendingUp className={cn("h-4 w-4", getTrustColor(source.trustScore))} />
                              <span className={cn("text-sm font-medium", getTrustColor(source.trustScore))}>
                                {source.trustScore}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {source.verified ? (
                              <div className="flex items-center gap-1 text-success">
                                <ShieldCheck className="h-4 w-4" />
                                <span className="text-xs">Verified</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-warning">
                                <Shield className="h-4 w-4" />
                                <span className="text-xs">Pending</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                              onClick={() => window.open(`https://${source.domain}`, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                              Visit
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </motion.div>

              {/* Summary Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4"
              >
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      {loading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        <p className="text-2xl font-bold text-foreground">{totalSources}</p>
                      )}
                      <p className="text-sm text-muted-foreground">Total Sources</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                      <ShieldCheck className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      {loading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        <p className="text-2xl font-bold text-foreground">{verifiedCount}</p>
                      )}
                      <p className="text-sm text-muted-foreground">Verified</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                      <span className="text-lg">✓</span>
                    </div>
                    <div>
                      {loading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        <p className="text-2xl font-bold text-foreground">{yourSources}</p>
                      )}
                      <p className="text-sm text-muted-foreground">Your Sources</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                      <ShieldX className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      {loading ? (
                        <Skeleton className="h-8 w-12" />
                      ) : (
                        <p className="text-2xl font-bold text-foreground">{competitorSources}</p>
                      )}
                      <p className="text-sm text-muted-foreground">Competitors</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
