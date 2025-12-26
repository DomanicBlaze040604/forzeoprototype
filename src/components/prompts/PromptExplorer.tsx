import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bot,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  FileText,
  Link2,
  Lightbulb,
  ChevronRight,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Citation {
  url: string;
  title?: string;
  verified?: boolean;
  trustScore?: number;
  hallucinationRisk?: "low" | "medium" | "high";
}

interface ModelResult {
  model: string;
  brand_mentioned: boolean;
  sentiment: string | null;
  rank: number | null;
  response_text: string | null;
  citations: Citation[];
  reasoning?: string;
  accuracy?: number;
  competitors_mentioned?: string[];
}

interface PromptExplorerProps {
  prompt: {
    id: string;
    text: string;
    visibility_score: number | null;
    tag?: string;
    intent?: string;
    funnel_stage?: string;
  };
  results: ModelResult[];
  recommendations?: string[];
  loading?: boolean;
  onVerifyCitation?: (url: string, claimText: string) => void;
}

const modelColors: Record<string, string> = {
  ChatGPT: "bg-emerald-500",
  Gemini: "bg-blue-500",
  Claude: "bg-orange-500",
  Perplexity: "bg-cyan-500",
  "Google AI Mode": "bg-red-500",
  "Bing Copilot": "bg-indigo-500",
};

const sentimentIcons = {
  positive: { icon: TrendingUp, color: "text-success" },
  neutral: { icon: Minus, color: "text-muted-foreground" },
  negative: { icon: TrendingDown, color: "text-destructive" },
};

export function PromptExplorer({
  prompt,
  results,
  recommendations = [],
  loading = false,
  onVerifyCitation,
}: PromptExplorerProps) {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Text copied to clipboard" });
  };

  const mentionedCount = results.filter((r) => r.brand_mentioned).length;
  const avgRank = results
    .filter((r) => r.rank !== null)
    .reduce((sum, r) => sum + (r.rank || 0), 0) / (mentionedCount || 1);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Prompt Explorer
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              "{prompt.text}"
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {prompt.tag && (
              <Badge variant="outline">{prompt.tag}</Badge>
            )}
            {prompt.intent && (
              <Badge variant="secondary">{prompt.intent}</Badge>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-4 gap-4">
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {prompt.visibility_score || 0}%
            </p>
            <p className="text-xs text-muted-foreground">Visibility</p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {mentionedCount}/{results.length}
            </p>
            <p className="text-xs text-muted-foreground">Engines</p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {avgRank > 0 ? `#${avgRank.toFixed(1)}` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Avg Rank</p>
          </div>
          <div className="rounded-lg bg-secondary/30 p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {results.flatMap((r) => r.citations).length}
            </p>
            <p className="text-xs text-muted-foreground">Citations</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="responses" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="responses">AI Responses</TabsTrigger>
            <TabsTrigger value="citations">Citations</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
            <TabsTrigger value="recommendations">Optimize</TabsTrigger>
          </TabsList>

          {/* AI Responses Tab */}
          <TabsContent value="responses" className="space-y-4">
            {results.map((result, index) => (
              <motion.div
                key={result.model}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "rounded-lg border border-border p-4 transition-all",
                  selectedModel === result.model && "ring-2 ring-primary"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        modelColors[result.model] || "bg-gray-500"
                      )}
                    >
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{result.model}</span>
                      {result.accuracy && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {result.accuracy}% accuracy
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.brand_mentioned ? (
                      <Badge variant="outline" className="border-success text-success">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Mentioned {result.rank ? `#${result.rank}` : ""}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-destructive text-destructive">
                        <XCircle className="mr-1 h-3 w-3" />
                        Not Mentioned
                      </Badge>
                    )}
                    {result.sentiment && (
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          sentimentIcons[result.sentiment as keyof typeof sentimentIcons]?.color
                        )}
                      >
                        {result.sentiment}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Full AI Response */}
                {result.response_text && (
                  <div className="relative">
                    <ScrollArea
                      className={cn(
                        "rounded-lg bg-background/50 p-4 border border-border/50",
                        expandedResponse === result.model ? "max-h-96" : "max-h-32"
                      )}
                    >
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {result.response_text}
                      </p>
                    </ScrollArea>
                    <div className="flex items-center justify-between mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedResponse(
                            expandedResponse === result.model ? null : result.model
                          )
                        }
                      >
                        {expandedResponse === result.model ? "Show Less" : "Show Full Response"}
                        <ChevronRight
                          className={cn(
                            "ml-1 h-4 w-4 transition-transform",
                            expandedResponse === result.model && "rotate-90"
                          )}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(result.response_text || "")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Reasoning */}
                {result.reasoning && (
                  <div className="mt-3 rounded-lg bg-primary/5 p-3 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Analysis Reasoning:</p>
                    <p className="text-sm text-foreground">{result.reasoning}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </TabsContent>

          {/* Citations Tab */}
          <TabsContent value="citations" className="space-y-4">
            {results.flatMap((r) => r.citations).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Link2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No citations found in AI responses</p>
              </div>
            ) : (
              <div className="space-y-2">
                {results.flatMap((result, rIdx) =>
                  result.citations.map((citation, cIdx) => (
                    <motion.div
                      key={`${rIdx}-${cIdx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: cIdx * 0.03 }}
                      className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div
                          className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                            citation.verified
                              ? "bg-success/20"
                              : citation.hallucinationRisk === "high"
                              ? "bg-destructive/20"
                              : "bg-warning/20"
                          )}
                        >
                          {citation.verified ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : citation.hallucinationRisk === "high" ? (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Link2 className="h-4 w-4 text-warning" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary hover:underline truncate block"
                          >
                            {citation.title || citation.url}
                          </a>
                          <p className="text-xs text-muted-foreground truncate">
                            {citation.url}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {result.model}
                        </Badge>
                        {citation.trustScore !== undefined && (
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-xs",
                              citation.trustScore >= 70
                                ? "text-success"
                                : citation.trustScore >= 40
                                ? "text-warning"
                                : "text-destructive"
                            )}
                          >
                            {citation.trustScore}%
                          </Badge>
                        )}
                        {onVerifyCitation && !citation.verified && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onVerifyCitation(citation.url, prompt.text)}
                          >
                            Verify
                          </Button>
                        )}
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {/* Competitors Tab */}
          <TabsContent value="competitors" className="space-y-4">
            {(() => {
              const allCompetitors = results.flatMap((r) => r.competitors_mentioned || []);
              const competitorCounts = allCompetitors.reduce((acc, comp) => {
                acc[comp] = (acc[comp] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const sortedCompetitors = Object.entries(competitorCounts).sort(
                (a, b) => b[1] - a[1]
              );

              if (sortedCompetitors.length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>No competitors detected in AI responses</p>
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {sortedCompetitors.map(([competitor, count], index) => (
                    <motion.div
                      key={competitor}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-foreground">
                          {competitor.charAt(0)}
                        </div>
                        <span className="font-medium text-foreground">{competitor}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{count}</p>
                          <p className="text-xs text-muted-foreground">mentions</p>
                        </div>
                        <Badge variant="outline">
                          {Math.round((count / results.length) * 100)}% of engines
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              );
            })()}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {recommendations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No recommendations available yet</p>
                <p className="text-sm">Run an analysis to get optimization suggestions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="rounded-lg border border-primary/30 bg-primary/5 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/20 p-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm text-foreground">{rec}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
