import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Globe, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCitationSources } from "@/hooks/useCitationSources";

interface CitationSource {
  domain: string;
  citations: number;
  verified: boolean;
  trustScore: number;
  hallucinationRisk: "low" | "medium" | "high";
}

interface CitationHeatmapProps {
  sources?: CitationSource[];
}

function getHeatColor(trustScore: number): string {
  if (trustScore >= 80) return "bg-emerald-500/80";
  if (trustScore >= 60) return "bg-yellow-500/80";
  if (trustScore >= 40) return "bg-orange-500/80";
  return "bg-red-500/80";
}

function getRiskIcon(risk: "low" | "medium" | "high") {
  switch (risk) {
    case "low":
      return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
    case "medium":
      return <AlertTriangle className="h-3 w-3 text-yellow-400" />;
    case "high":
      return <XCircle className="h-3 w-3 text-red-400" />;
  }
}

function getRiskColor(risk: "low" | "medium" | "high") {
  switch (risk) {
    case "low":
      return "text-emerald-400";
    case "medium":
      return "text-yellow-400";
    case "high":
      return "text-red-400";
  }
}

export function CitationHeatmap({ sources: propSources }: CitationHeatmapProps) {
  const { sources: hookSources, loading, totalSources, verifiedCount, avgTrustScore, highRiskCount } = useCitationSources();
  
  // Use provided sources or fetch from hook
  const sources = propSources && propSources.length > 0 ? propSources : hookSources;
  const maxCitations = Math.max(...sources.map((s) => s.citations), 1);
  const sortedSources = [...sources].sort((a, b) => b.citations - a.citations);

  // Calculate stats from actual data
  const displayVerifiedCount = propSources 
    ? sources.filter((s) => s.verified).length 
    : verifiedCount;
  const displayHighRiskCount = propSources 
    ? sources.filter((s) => s.hallucinationRisk === "high").length 
    : highRiskCount;
  const displayAvgTrustScore = propSources 
    ? (sources.length > 0 ? Math.round(sources.reduce((sum, s) => sum + s.trustScore, 0) / sources.length) : 0)
    : avgTrustScore;

  if (loading && (!propSources || propSources.length === 0)) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Citation Source Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sources.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Citation Source Heatmap
          </CardTitle>
          <CardDescription>
            Visualization of AI citation sources and their trust levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-muted-foreground">
            No citation sources found. Verify citations to see the heatmap.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                Citation Source Heatmap
              </CardTitle>
              <CardDescription>
                Visualization of AI citation sources and their trust levels
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-emerald-400 border-emerald-400/30">
                {displayVerifiedCount} Verified
              </Badge>
              {displayHighRiskCount > 0 && (
                <Badge variant="outline" className="text-red-400 border-red-400/30">
                  {displayHighRiskCount} High Risk
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="mb-6 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-secondary/30 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{sources.length}</p>
              <p className="text-xs text-muted-foreground">Total Sources</p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{displayAvgTrustScore}%</p>
              <p className="text-xs text-muted-foreground">Avg Trust Score</p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-4 text-center">
              <p className="text-2xl font-bold text-foreground">
                {sources.reduce((sum, s) => sum + s.citations, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Citations</p>
            </div>
          </div>

          {/* Bubble Heatmap */}
          <TooltipProvider>
            <div className="flex flex-wrap gap-3 justify-center mb-6">
              {sortedSources.map((source, index) => {
                const size = 40 + (source.citations / maxCitations) * 60;
                return (
                  <Tooltip key={source.domain}>
                    <TooltipTrigger>
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110",
                          getHeatColor(source.trustScore)
                        )}
                        style={{
                          width: size,
                          height: size,
                        }}
                      >
                        <span className="text-xs font-bold text-white">
                          {source.citations}
                        </span>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-card border-border">
                      <div className="space-y-2">
                        <p className="font-medium text-foreground">{source.domain}</p>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Citations:</span>
                          <span className="text-foreground">{source.citations}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Trust Score:</span>
                          <span className="text-foreground">{source.trustScore}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Risk:</span>
                          <span className={getRiskColor(source.hallucinationRisk)}>
                            {source.hallucinationRisk}
                          </span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>

          {/* Source List */}
          <div className="space-y-2">
            {sortedSources.slice(0, 6).map((source, index) => (
              <motion.div
                key={source.domain}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center justify-between rounded-lg bg-secondary/20 p-3 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      getHeatColor(source.trustScore)
                    )}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {source.domain}
                  </span>
                  {source.verified && (
                    <Badge variant="secondary" className="text-xs">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    {getRiskIcon(source.hallucinationRisk)}
                    <span className={cn("text-xs", getRiskColor(source.hallucinationRisk))}>
                      {source.hallucinationRisk}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{source.citations}</p>
                    <p className="text-xs text-muted-foreground">citations</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
              <span>High Trust (80%+)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <span>Medium (60-79%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-orange-500/80" />
              <span>Low (40-59%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-3 rounded-full bg-red-500/80" />
              <span>Risk (&lt;40%)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
