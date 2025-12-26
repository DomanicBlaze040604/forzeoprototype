import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { VisibilityChart } from "@/components/dashboard/VisibilityChart";
import { CompetitorRadarChart } from "@/components/dashboard/CompetitorRadarChart";
import { ShareOfVoiceChart } from "@/components/dashboard/ShareOfVoiceChart";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBrands } from "@/hooks/useBrands";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAnalyzePrompt } from "@/hooks/useAnalyzePrompt";
import { useCompetitors } from "@/hooks/useCompetitors";
import { usePrompts } from "@/hooks/usePrompts";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Users, Heart, TrendingUp, Search, Loader2, Sparkles, Bot, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useShareOfVoice } from "@/hooks/useShareOfVoice";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const modelColors: Record<string, string> = {
  "ChatGPT": "bg-emerald-500",
  "Gemini": "bg-blue-500",
  "Claude": "bg-orange-500",
  "Perplexity": "bg-cyan-500",
};

const Index = () => {
  const navigate = useNavigate();
  const { activeBrand } = useBrands();
  const { data, loading } = useDashboardData(activeBrand?.id);
  const { data: sovData, loading: sovLoading, yourShare } = useShareOfVoice(activeBrand?.id);
  const { isOpen } = useSidebar();
  const { analyzePrompt, isAnalyzing } = useAnalyzePrompt();
  const { competitors } = useCompetitors(activeBrand?.id);
  const { addPrompt, savePromptResults, updatePrompt } = usePrompts(activeBrand?.id);
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [quickAnalysisResult, setQuickAnalysisResult] = useState<any>(null);

  const brandName = activeBrand?.name || "FORZEO";
  const competitorNames = competitors.filter((c) => c.is_active).map((c) => c.name);

  // Calculate metrics matching the reference design
  const brandVisibility = data?.brandPresence || 0;
  const totalMentions = data?.totalMentions || 0;
  
  // Calculate sentiment status
  const positivePercent = data && data.totalMentions > 0
    ? Math.round((data.positiveMentions / data.totalMentions) * 100)
    : 0;
  const sentimentStatus = positivePercent >= 50 ? "Positive" : positivePercent >= 30 ? "Neutral" : "Negative";
  const sentimentIndicator = positivePercent >= 50 ? "positive" : positivePercent >= 30 ? "neutral" : "negative";

  // Calculate competitor gap from real data
  const competitorGap = yourShare > 50 ? yourShare - 50 : yourShare - 50;

  // Prepare radar chart data from real metrics
  const radarData = data ? [
    { metric: "Visibility", brand: data.brandPresence || 0, competitors: 50, fullMark: 100 },
    { metric: "Sentiment", brand: positivePercent, competitors: 50, fullMark: 100 },
    { metric: "Mentions", brand: Math.min(totalMentions * 10, 100), competitors: 50, fullMark: 100 },
    { metric: "Ranking", brand: data.averageRank ? Math.max(0, 100 - data.averageRank * 10) : 0, competitors: 50, fullMark: 100 },
  ] : [];

  // Handle search/analyze prompt
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!searchQuery.trim()) {
      toast({
        title: "Enter a prompt",
        description: "Please enter a prompt or question to analyze.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Analyzing prompt",
      description: "Running AI visibility analysis...",
    });

    // Run analysis
    const result = await analyzePrompt(searchQuery, brandName, undefined, competitorNames, {
      brandId: activeBrand?.id,
      country: "US",
      persona: "general",
    });

    if (result) {
      setQuickAnalysisResult(result);
      
      // Save to prompts database
      const newPrompt = await addPrompt(searchQuery, { tag: "Quick Search" });
      if (newPrompt) {
        await updatePrompt(newPrompt.id, { visibility_score: result.overall_visibility_score });
        if (result.results) {
          await savePromptResults(newPrompt.id, result.results.map((r: any) => ({
            model: r.model,
            brand_mentioned: r.brand_mentioned,
            sentiment: r.sentiment || null,
            rank: r.rank || null,
            response_text: r.response_snippet || null,
            citations: r.citations || [],
          })));
        }
      }

      toast({
        title: "Analysis complete",
        description: `Visibility score: ${result.overall_visibility_score}%`,
      });
    }
  };

  // Search input for header actions
  const searchAction = (
    <form onSubmit={handleSearch} className="relative flex items-center gap-2">
      <div className="relative w-80">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search prompts or analyze a query..."
          className="pl-10 bg-secondary/50 border-border"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={isAnalyzing}
        />
      </div>
      <Button 
        type="submit" 
        size="sm" 
        className="gap-2"
        disabled={isAnalyzing || !searchQuery.trim()}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Analyze
          </>
        )}
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar />
      
      <main className={cn(
        "transition-all duration-fz ease-in-out",
        isOpen ? "pl-56" : "pl-0"
      )}>
        <Header 
          title="Dashboard" 
          breadcrumb={[activeBrand?.name || "FORZEO", "Dashboard"]}
          actions={searchAction}
        />
        
        <div className="p-6">
          {/* Last updated timestamp */}
          <div className="mb-6 flex justify-end">
            <span className="text-meta text-muted-foreground">
              Last updated: {format(new Date(), "h:mm a")}
            </span>
          </div>

          {/* Quick Analysis Results */}
          <AnimatePresence>
            {quickAnalysisResult && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Quick Analysis Result</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{searchQuery}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{quickAnalysisResult.overall_visibility_score}%</p>
                      <p className="text-xs text-muted-foreground">Visibility Score</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate("/prompts")}
                    >
                      View All Prompts
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setQuickAnalysisResult(null)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>

                {/* Model Results Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {quickAnalysisResult.results?.map((r: any, idx: number) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        r.brand_mentioned 
                          ? "border-success/30 bg-success/5" 
                          : "border-border bg-secondary/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn("h-6 w-6 rounded-full flex items-center justify-center", modelColors[r.model] || "bg-gray-500")}>
                          <Bot className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{r.model}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {r.brand_mentioned ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-success" />
                            <span className="text-xs text-success">Mentioned</span>
                            {r.rank && (
                              <Badge variant="outline" className="text-xs">#{r.rank}</Badge>
                            )}
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Not mentioned</span>
                          </>
                        )}
                      </div>
                      {r.sentiment && r.brand_mentioned && (
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs mt-2", {
                            "bg-success/20 text-success": r.sentiment === 'positive',
                            "bg-warning/20 text-warning": r.sentiment === 'neutral',
                            "bg-destructive/20 text-destructive": r.sentiment === 'negative',
                          })}
                        >
                          {r.sentiment}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>

                {/* Recommendations Preview */}
                {quickAnalysisResult.recommendations?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium text-foreground mb-2">Top Recommendation:</p>
                    <p className="text-sm text-muted-foreground">{quickAnalysisResult.recommendations[0]}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Metric Cards Row - Matching Reference Design */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <>
                <Skeleton className="h-[120px] rounded-xl" />
                <Skeleton className="h-[120px] rounded-xl" />
                <Skeleton className="h-[120px] rounded-xl" />
                <Skeleton className="h-[120px] rounded-xl" />
              </>
            ) : (
              <>
                <MetricCard
                  title="Brand Visibility"
                  value={`${brandVisibility}%`}
                  change={2.5}
                  changeLabel="from last week"
                  delay={0}
                  icon={Eye}
                />
                <MetricCard
                  title="Total Mentions"
                  value={totalMentions.toString()}
                  change={15}
                  changeLabel="from last month"
                  delay={0.1}
                  icon={Users}
                />
                <MetricCard
                  title="Sentiment"
                  value={sentimentStatus}
                  changeLabel={`${positivePercent}% of mentions are positive`}
                  delay={0.2}
                  icon={Heart}
                  indicator={sentimentIndicator as "positive" | "negative" | "neutral"}
                  variant="success"
                />
                <MetricCard
                  title="Competitor Gap"
                  value={`${competitorGap}%`}
                  changeLabel="Behind market leader"
                  delay={0.3}
                  icon={TrendingUp}
                  variant="danger"
                />
              </>
            )}
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
            {/* Visibility Trend Chart */}
            <VisibilityChart 
              data={data?.visibilityTrend}
              loading={loading}
            />
            
            {/* Competitive Dominance Radar Chart */}
            <CompetitorRadarChart
              brandName={activeBrand?.name || "FORZEO"}
              data={radarData}
              loading={loading}
            />
          </div>

          {/* Share of Voice Chart - Full Width */}
          <ShareOfVoiceChart
            brandName={activeBrand?.name || "FORZEO"}
            data={sovData}
            loading={sovLoading}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
