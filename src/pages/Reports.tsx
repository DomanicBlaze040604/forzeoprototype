import { useState } from "react";
import { motion } from "framer-motion";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGenerateReport } from "@/hooks/useGenerateReport";
import { useAuth } from "@/hooks/useAuth";
import { useBrands } from "@/hooks/useBrands";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useCompetitors } from "@/hooks/useCompetitors";
import { PersonaComparisonReport } from "@/components/reports/PersonaComparisonReport";
import {
  FileText,
  Download,
  FileSpreadsheet,
  Loader2,
  TrendingUp,
  Users,
  Link2,
  BarChart3,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ReportType {
  id: "visibility" | "competitor" | "citation" | "full";
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const reportTypes: ReportType[] = [
  {
    id: "visibility",
    name: "Visibility Report",
    description: "Brand presence across AI models",
    icon: TrendingUp,
    color: "bg-primary/10 text-primary",
  },
  {
    id: "competitor",
    name: "Competitor Analysis",
    description: "Compare against key competitors",
    icon: Users,
    color: "bg-blue-500/10 text-blue-400",
  },
  {
    id: "citation",
    name: "Citation Report",
    description: "Source and citation breakdown",
    icon: Link2,
    color: "bg-purple-500/10 text-purple-400",
  },
  {
    id: "full",
    name: "Full Report",
    description: "Comprehensive analysis with all metrics",
    icon: BarChart3,
    color: "bg-orange-500/10 text-orange-400",
  },
];

// Mock data for recent reports
const recentReports = [
  { id: "1", title: "Weekly Visibility Report", type: "visibility", createdAt: new Date(Date.now() - 86400000) },
  { id: "2", title: "Competitor Analysis Q4", type: "competitor", createdAt: new Date(Date.now() - 172800000) },
  { id: "3", title: "Citation Sources Review", type: "citation", createdAt: new Date(Date.now() - 259200000) },
];

export default function Reports() {
  const [selectedType, setSelectedType] = useState<ReportType["id"] | null>(null);
  const [generatedReport, setGeneratedReport] = useState<any>(null);
  const { isOpen } = useSidebar();
  const { generateReport, exportToCsv, exportToPdf, isGenerating } = useGenerateReport();
  const { user } = useAuth();
  const { activeBrand } = useBrands();
  const { data: dashboardData } = useDashboardData(activeBrand?.id);
  const { competitors } = useCompetitors(activeBrand?.id);

  const handleGenerateReport = async (type: ReportType["id"]) => {
    setSelectedType(type);
    
    // Use real data from hooks
    const reportData = {
      visibilityScore: dashboardData?.brandPresence || 0,
      totalMentions: dashboardData?.totalMentions || 0,
      positiveMentions: dashboardData?.positiveMentions || 0,
      averageRank: dashboardData?.averageRank || 0,
      prompts: dashboardData?.visibilityTrend?.map((t: any) => ({
        date: t.date,
        visibility: t.visibility,
      })) || [],
      competitors: competitors.map(c => ({
        name: c.name,
        score: c.last_visibility_score || 0,
        rank: c.last_rank || 0,
      })),
      sources: [],
    };

    const brandName = activeBrand?.name || "FORZEO";
    const report = await generateReport(type, brandName, reportData);
    if (report) {
      setGeneratedReport(report);
    }
  };

  const handleExportPdf = () => {
    if (generatedReport) {
      exportToPdf(generatedReport, `forzeo-${selectedType}-report`);
    }
  };

  const handleExportCsv = () => {
    if (generatedReport?.keyMetrics) {
      exportToCsv(generatedReport.keyMetrics, `forzeo-${selectedType}-metrics`);
    }
  };

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar />
      
      <main className={cn(
        "transition-all duration-200 ease-in-out",
        isOpen ? "pl-56" : "pl-0"
      )}>
        <Header title="Reports" breadcrumb={["FORZEO", "Reports"]} />
        
        <div className="p-6">
          <Tabs defaultValue="generate" className="space-y-6">
            <TabsList>
              <TabsTrigger value="generate" className="gap-2">
                <FileText className="h-4 w-4" />
                Generate Reports
              </TabsTrigger>
              <TabsTrigger value="persona" className="gap-2">
                <Bot className="h-4 w-4" />
                Persona Comparison
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate">
              {/* Report Types */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
              >
                <h2 className="mb-4 text-lg font-semibold text-foreground">Generate New Report</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {reportTypes.map((type, index) => (
                    <motion.button
                      key={type.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleGenerateReport(type.id)}
                      disabled={isGenerating}
                      className={cn(
                        "group relative rounded-xl border border-border bg-card p-6 text-left transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
                        selectedType === type.id && isGenerating && "border-primary"
                      )}
                    >
                      <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-lg", type.color)}>
                        {isGenerating && selectedType === type.id ? (
                          <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                          <type.icon className="h-6 w-6" />
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground">{type.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{type.description}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

          {/* Generated Report Preview */}
          {generatedReport && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 rounded-xl border border-border bg-card p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{generatedReport.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    Generated {formatDistanceToNow(new Date(generatedReport.generatedAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
                    <FileSpreadsheet className="h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button className="gap-2" onClick={handleExportPdf}>
                    <Download className="h-4 w-4" />
                    Export PDF
                  </Button>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="mb-6 rounded-lg bg-primary/5 border-l-4 border-primary p-4">
                <h3 className="mb-2 text-lg font-semibold text-foreground">Executive Summary</h3>
                <p className="text-muted-foreground leading-relaxed">{generatedReport.executiveSummary}</p>
              </div>

              {/* Key Metrics */}
              {generatedReport.keyMetrics?.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Key Metrics</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {generatedReport.keyMetrics.map((metric: any, index: number) => (
                      <div key={index} className="rounded-lg bg-secondary/30 p-4">
                        <p className="text-sm text-muted-foreground">{metric.name}</p>
                        <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                        <p className={cn(
                          "text-sm",
                          metric.change?.startsWith("+") ? "text-success" : metric.change?.startsWith("-") ? "text-destructive" : "text-muted-foreground"
                        )}>
                          {metric.change}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis */}
              {generatedReport.analysis && (
                <div className="mb-6">
                  <h3 className="mb-2 text-lg font-semibold text-foreground">Detailed Analysis</h3>
                  <div className="rounded-lg bg-secondary/20 p-4">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{generatedReport.analysis}</p>
                  </div>
                </div>
              )}

              {/* Competitor Insights */}
              {generatedReport.competitorInsights?.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Competitor Insights</h3>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-secondary/30">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Competitor</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Score</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-foreground">Trend</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {generatedReport.competitorInsights.map((comp: any, index: number) => (
                          <tr key={index} className="hover:bg-secondary/10">
                            <td className="px-4 py-3 text-sm text-foreground">{comp.name}</td>
                            <td className="px-4 py-3 text-sm text-foreground">{comp.score}%</td>
                            <td className={cn(
                              "px-4 py-3 text-sm font-medium",
                              comp.trend === "up" ? "text-success" : comp.trend === "down" ? "text-destructive" : "text-muted-foreground"
                            )}>
                              {comp.trend === "up" ? "↑" : comp.trend === "down" ? "↓" : "→"} {comp.trend}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {generatedReport.recommendations?.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-4 text-lg font-semibold text-foreground">Recommendations</h3>
                  <div className="space-y-3">
                    {generatedReport.recommendations.map((rec: any, index: number) => (
                      <div
                        key={index}
                        className={cn(
                          "rounded-lg border-l-4 bg-secondary/30 p-4",
                          rec.priority === "high" && "border-l-destructive",
                          rec.priority === "medium" && "border-l-warning",
                          rec.priority === "low" && "border-l-primary"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-xs font-medium uppercase px-2 py-0.5 rounded",
                            rec.priority === "high" && "bg-destructive/20 text-destructive",
                            rec.priority === "medium" && "bg-warning/20 text-warning",
                            rec.priority === "low" && "bg-primary/20 text-primary"
                          )}>
                            {rec.priority} priority
                          </span>
                        </div>
                        <p className="font-medium text-foreground">{rec.action}</p>
                        <p className="text-sm text-muted-foreground mt-1">Expected Impact: {rec.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Predictions */}
              {generatedReport.predictions && (
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">Future Outlook</h3>
                  <div className="rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4">
                    <p className="text-muted-foreground leading-relaxed">{generatedReport.predictions}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Recent Reports */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border bg-card"
          >
            <div className="border-b border-border p-4">
              <h2 className="text-lg font-semibold text-foreground">Recent Reports</h2>
            </div>
            <div className="divide-y divide-border">
              {recentReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{report.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(report.createdAt, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
            </TabsContent>

            <TabsContent value="persona">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <PersonaComparisonReport />
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
