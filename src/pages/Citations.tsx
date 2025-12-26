import { useState } from "react";
import { motion } from "framer-motion";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrands } from "@/hooks/useBrands";
import { useCitationHistory } from "@/hooks/useCitationHistory";
import { CitationVerifier } from "@/components/citations/CitationVerifier";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ExternalLink,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Citations() {
  const { activeBrand } = useBrands();
  const { citations, stats, loading, refresh, deleteCitation } = useCitationHistory();
  const { isOpen } = useSidebar();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteCitation(id);
    setDeletingId(null);
  };

  const getRiskIcon = (risk: string | null) => {
    switch (risk) {
      case "low":
        return <ShieldCheck className="h-4 w-4 text-success" />;
      case "medium":
        return <Shield className="h-4 w-4 text-warning" />;
      case "high":
      case "very_high":
        return <ShieldAlert className="h-4 w-4 text-destructive" />;
      default:
        return <ShieldQuestion className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRiskColor = (risk: string | null) => {
    switch (risk) {
      case "low":
        return "bg-success/20 text-success border-success/30";
      case "medium":
        return "bg-warning/20 text-warning border-warning/30";
      case "high":
      case "very_high":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar />
      
      <main className={cn(
        "transition-all duration-200 ease-in-out",
        isOpen ? "pl-56" : "pl-0"
      )}>
        <Header 
          title="Citation Verification" 
          breadcrumb={[activeBrand?.name || "FORZEO", "Citations"]} 
        />
        
        <div className="p-6">
          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-5 gap-4 mb-6"
          >
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Verified</p>
                    <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  </div>
                  <PieChart className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Low Risk</p>
                    <p className="text-2xl font-bold text-success">{stats.lowRisk}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Medium Risk</p>
                    <p className="text-2xl font-bold text-warning">{stats.mediumRisk}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-warning" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">High Risk</p>
                    <p className="text-2xl font-bold text-destructive">{stats.highRisk}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg. Similarity</p>
                    <p className="text-2xl font-bold text-foreground">
                      {Math.round(stats.avgSimilarity * 100)}%
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Tabs defaultValue="verify" className="space-y-6">
            <TabsList>
              <TabsTrigger value="verify">Verify New</TabsTrigger>
              <TabsTrigger value="history">
                History ({citations.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="verify">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <CitationVerifier onVerificationComplete={refresh} />
              </motion.div>
            </TabsContent>

            <TabsContent value="history">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Verification History</CardTitle>
                      <CardDescription>
                        All verified citations and their hallucination risk scores
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refresh}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      <span className="ml-2">Refresh</span>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : citations.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No citations verified yet.</p>
                        <p className="text-sm">
                          Use the "Verify New" tab to check AI-generated citations.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {citations.map((citation) => (
                          <motion.div
                            key={citation.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border border-border rounded-lg p-4 hover:bg-secondary/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  {getRiskIcon(citation.hallucination_risk)}
                                  <a
                                    href={citation.source_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-primary hover:underline truncate flex items-center gap-1"
                                  >
                                    {(() => {
                                      try {
                                        return new URL(citation.source_url).hostname;
                                      } catch {
                                        return citation.source_url;
                                      }
                                    })()}
                                    <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                  </a>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                  {citation.claim_text}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="outline" className="text-xs">
                                    {citation.verification_status || "pending"}
                                  </Badge>
                                  <span>•</span>
                                  <span>
                                    {new Date(citation.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <Badge
                                    variant="outline"
                                    className={cn("text-xs", getRiskColor(citation.hallucination_risk))}
                                  >
                                    {citation.hallucination_risk === "very_high"
                                      ? "Very High Risk"
                                      : citation.hallucination_risk
                                      ? `${citation.hallucination_risk.charAt(0).toUpperCase()}${citation.hallucination_risk.slice(1)} Risk`
                                      : "Unknown"}
                                  </Badge>
                                  {citation.similarity_score !== null && (
                                    <div className="mt-1">
                                      <Progress
                                        value={citation.similarity_score * 100}
                                        className="h-1.5 w-20"
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        {Math.round(citation.similarity_score * 100)}% match
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(citation.id)}
                                  disabled={deletingId === citation.id}
                                >
                                  {deletingId === citation.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
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
