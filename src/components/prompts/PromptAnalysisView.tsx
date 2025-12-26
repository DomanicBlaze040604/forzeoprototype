import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { PromptExplorer } from "./PromptExplorer";
import { useAnalysisPipeline } from "@/hooks/useAnalysisPipeline";
import { useBrands } from "@/hooks/useBrands";
import { useCompetitors } from "@/hooks/useCompetitors";
import { usePrompts } from "@/hooks/usePrompts";
import {
  Search,
  Filter,
  Play,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PromptWithResults {
  id: string;
  text: string;
  visibility_score: number | null;
  intent?: string;
  funnel_stage?: string;
  topic_cluster?: string;
  results: any[];
  lastAnalyzed?: string;
}

export function PromptAnalysisView() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState<PromptWithResults | null>(null);
  const [filterIntent, setFilterIntent] = useState<string>("all");
  const [filterFunnel, setFilterFunnel] = useState<string>("all");
  
  const { prompts, loading: promptsLoading, refetch: fetchPrompts } = usePrompts();
  const { loading: analysisLoading, runPipeline } = useAnalysisPipeline();
  const { brands, activeBrand } = useBrands();
  const { competitors } = useCompetitors(activeBrand?.id);

  // Filter prompts
  const filteredPrompts = prompts.filter(p => {
    const matchesSearch = p.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIntent = filterIntent === "all" || p.intent === filterIntent;
    const matchesFunnel = filterFunnel === "all" || p.funnel_stage === filterFunnel;
    return matchesSearch && matchesIntent && matchesFunnel;
  });

  const handleAnalyzePrompt = async (prompt: any) => {
    if (!activeBrand) return;
    
    const result = await runPipeline(
      prompt.text,
      { name: activeBrand.name, aliases: [], domains: [] },
      competitors.map(c => ({ name: c.name })),
      { engines: ["google_sge", "bing_copilot"], generateAnswers: true, detectMentions: true, calculateScores: true }
    );
    
    if (result) {
      // Update selected prompt with results
      setSelectedPrompt({
        ...prompt,
        results: result.aiAnswers?.map((a: any) => ({
          model: a.style === "google_sge" ? "Google AI Mode" : a.style === "bing_copilot" ? "Bing Copilot" : a.style,
          brand_mentioned: result.mentionResults?.find((m: any) => m.engine === a.style)?.mentioned || false,
          sentiment: result.mentionResults?.find((m: any) => m.engine === a.style)?.sentiment || null,
          rank: result.mentionResults?.find((m: any) => m.engine === a.style)?.contexts?.[0]?.sentenceIndex,
          response_text: a.answer,
          citations: a.citations?.map((c: any) => ({
            url: c.url,
            title: c.title,
            verified: false,
            trustScore: c.relevanceScore * 100,
          })) || [],
          reasoning: a.keyPoints?.join(". "),
          accuracy: a.confidence,
          competitors_mentioned: result.mentionResults?.find((m: any) => m.engine === a.style)?.competitors
            ?.filter((c: any) => c.mentioned)
            ?.map((c: any) => c.name) || [],
        })) || [],
        visibility_score: result.scores?.aiVisibilityScore,
        lastAnalyzed: new Date().toISOString(),
      });
    }
  };

  const getTrendIcon = (score: number | null) => {
    if (!score) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (score >= 60) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (score >= 30) return <Minus className="h-3 w-3 text-yellow-500" />;
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Prompt List */}
      <div className="col-span-4 space-y-4">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Prompts
            </CardTitle>
            
            {/* Search & Filters */}
            <div className="space-y-3 mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={filterIntent} onValueChange={setFilterIntent}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Intent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Intents</SelectItem>
                    <SelectItem value="informational">Informational</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="navigational">Navigational</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterFunnel} onValueChange={setFilterFunnel}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Funnel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="awareness">TOFU</SelectItem>
                    <SelectItem value="consideration">MOFU</SelectItem>
                    <SelectItem value="decision">BOFU</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-4 pb-4">
              {promptsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : filteredPrompts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No prompts found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPrompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className={cn(
                        "rounded-lg border p-3 cursor-pointer transition-all",
                        selectedPrompt?.id === prompt.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setSelectedPrompt(prompt as any)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium line-clamp-2">{prompt.text}</p>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        {getTrendIcon(prompt.visibility_score)}
                        <span className="text-xs text-muted-foreground">
                          {prompt.visibility_score ?? "—"}%
                        </span>
                        
                        {prompt.intent && (
                          <Badge variant="outline" className="text-xs">
                            {prompt.intent}
                          </Badge>
                        )}
                        {prompt.funnel_stage && (
                          <Badge variant="secondary" className="text-xs">
                            {prompt.funnel_stage}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Prompt Detail / Explorer */}
      <div className="col-span-8">
        {selectedPrompt ? (
          <div className="space-y-4">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleAnalyzePrompt(selectedPrompt)}
                  disabled={analysisLoading}
                >
                  {analysisLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  {analysisLoading ? "Analyzing..." : "Run Analysis"}
                </Button>
                
                <Button variant="outline" onClick={() => fetchPrompts()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              {selectedPrompt.lastAnalyzed && (
                <span className="text-xs text-muted-foreground">
                  Last analyzed: {new Date(selectedPrompt.lastAnalyzed).toLocaleString()}
                </span>
              )}
            </div>
            
            {/* Prompt Explorer */}
            <PromptExplorer
              prompt={{
                id: selectedPrompt.id,
                text: selectedPrompt.text,
                visibility_score: selectedPrompt.visibility_score,
                tag: selectedPrompt.topic_cluster,
                intent: selectedPrompt.intent,
                funnel_stage: selectedPrompt.funnel_stage,
              }}
              results={selectedPrompt.results || []}
              recommendations={[
                selectedPrompt.visibility_score && selectedPrompt.visibility_score < 50 
                  ? "Consider adding more authoritative sources to your content"
                  : null,
                selectedPrompt.results?.some((r: any) => !r.brand_mentioned)
                  ? "Your brand is not mentioned in some AI engines - optimize content for those platforms"
                  : null,
                selectedPrompt.results?.some((r: any) => r.sentiment === "negative")
                  ? "Some responses have negative sentiment - review and address concerns"
                  : null,
              ].filter(Boolean) as string[]}
              loading={analysisLoading}
            />
          </div>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a prompt to analyze</p>
              <p className="text-sm">Choose from the list or add a new prompt</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
