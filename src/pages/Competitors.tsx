import { useState } from "react";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown,
  Target,
  Users,
  BarChart3,
  RefreshCw,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import { useCompetitorAnalysis } from "@/hooks/useCompetitorAnalysis";

export default function Competitors() {
  const { isOpen } = useSidebar();
  const { competitors, yourBrand, gapMetrics, loading, error, refresh } = useCompetitorAnalysis();

  // Prepare chart data
  const sovChartData = yourBrand ? [
    { name: yourBrand.name, mentions: yourBrand.mentions, sov: yourBrand.sov },
    ...competitors.slice(0, 3).map(c => ({
      name: c.name,
      mentions: c.mentions,
      sov: c.sov,
    }))
  ] : [];

  const sentimentChartData = yourBrand ? [
    { 
      name: yourBrand.name, 
      positive: yourBrand.sentiment.positive, 
      neutral: yourBrand.sentiment.neutral, 
      negative: yourBrand.sentiment.negative 
    },
    ...competitors.slice(0, 3).map(c => ({
      name: c.name,
      positive: c.sentiment.positive,
      neutral: c.sentiment.neutral,
      negative: c.sentiment.negative,
    }))
  ] : [];

  const leader = competitors[0];
  const gapToLeader = leader && yourBrand ? (yourBrand.sov - leader.sov).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn("transition-all duration-200 ease-in-out", isOpen ? "ml-56" : "ml-0")}>
        <Header title="Competitors" />
        <main className="p-6">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">Competitor Analysis</h1>
              <p className="text-muted-foreground">
                Compare your brand's AI visibility against competitors
              </p>
            </div>
            <Button variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 mb-6">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">{yourBrand?.sov || 0}%</p>
                      <p className="text-sm text-muted-foreground">Your SOV</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">{leader?.sov || 0}%</p>
                      <p className="text-sm text-muted-foreground">Leader SOV ({leader?.name || "N/A"})</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">{gapToLeader}%</p>
                      <p className="text-sm text-muted-foreground">Gap to Leader</p>
                    </div>
                  </div>
                </div>
                <div className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Users className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-semibold text-foreground">{competitors.length}</p>
                      <p className="text-sm text-muted-foreground">Competitors Tracked</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Competitive SOV & Rank Chart */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-semibold text-foreground mb-1">Competitive SOV & Mentions</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {leader ? `${leader.name} dominates SOV` : "Add competitors to see comparison"}
                  </p>
                  <div className="h-[300px]">
                    {sovChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sovChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis type="number" stroke="#666" />
                          <YAxis dataKey="name" type="category" stroke="#666" width={80} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                            formatter={(value: number, name: string) => {
                              if (name === 'sov') return [`${value}%`, 'Share of Voice'];
                              if (name === 'mentions') return [value, 'Total Mentions'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="mentions" name="Total Mentions" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="sov" name="SOV %" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Sentiment Breakdown Chart */}
                <div className="bg-card border border-border rounded-xl p-6">
                  <h3 className="font-semibold text-foreground mb-1">Sentiment Breakdown</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sentiment distribution across brands
                  </p>
                  <div className="h-[300px]">
                    {sentimentChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sentimentChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis type="number" domain={[0, 100]} stroke="#666" />
                          <YAxis dataKey="name" type="category" stroke="#666" width={80} />
                          <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} />
                          <Legend />
                          <Bar dataKey="positive" name="Positive" stackId="a" fill="#10b981" />
                          <Bar dataKey="neutral" name="Neutral" stackId="a" fill="#3b82f6" />
                          <Bar dataKey="negative" name="Negative" stackId="a" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Gap Analysis Table */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      Gap Analysis: {yourBrand?.name || "Your Brand"} vs Market Leader
                    </h3>
                    <p className="text-sm text-muted-foreground">Detailed comparison against top competitor</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Focus Area: Citations & SOV
                  </Button>
                </div>
                {gapMetrics.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">METRIC</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">{yourBrand?.name?.toUpperCase() || "YOUR BRAND"}</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">{leader?.name?.toUpperCase() || "LEADER"} (LEADER)</th>
                          <th className="text-left p-4 text-sm font-medium text-muted-foreground">GAP TO LEADER</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gapMetrics.map((row, idx) => (
                          <tr key={idx} className="border-b border-border hover:bg-muted/20 transition-colors">
                            <td className="p-4 font-medium text-foreground">{row.metric}</td>
                            <td className="p-4">
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                {row.yourValue}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                                {row.leaderValue}
                              </Badge>
                            </td>
                            <td className="p-4">
                              <Badge 
                                variant={row.gap.startsWith("-") ? "destructive" : "default"} 
                                className="font-mono"
                              >
                                {row.gap}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users className="h-12 w-12 mb-4 opacity-30" />
                    <p>No competitors tracked yet</p>
                    <p className="text-sm">Add competitors in Settings to see gap analysis</p>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
