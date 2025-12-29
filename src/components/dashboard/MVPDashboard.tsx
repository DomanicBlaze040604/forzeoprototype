/**
 * FORZEO MVP Dashboard - Enhanced with DataForSEO Features
 * 
 * Displays:
 * - DataForSEO results (SERP, AI Overview, Citations, People Also Ask)
 * - Groq results for comparison
 * - Combined analysis with visibility scoring
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Search, 
  Loader2, 
  TrendingUp, 
  Target,
  Users,
  MessageSquare,
  Lightbulb,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  FileText,
  ArrowRight,
  ExternalLink,
  Globe,
  HelpCircle,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMVPAnalysis, type MVPAnalysisResult } from "@/hooks/useMVPAnalysis";

// Helper: Get color based on score
function getScoreColor(score: number): string {
  if (score >= 70) return "text-green-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

// Helper: Calculate brand share of voice
function calculateBrandSOV(result: MVPAnalysisResult): number {
  const brandMentions = result.visibilityScore?.mentionCount ?? 0;
  const competitorMentions = result.visibilityScore?.competitors.reduce(
    (sum, c) => sum + c.mentionCount, 0
  ) ?? 0;
  const total = brandMentions + competitorMentions;
  if (total === 0) return 0;
  return Math.round((brandMentions / total) * 100);
}

// ScoreCard Component
interface ScoreCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  color?: string;
  subtext?: string;
}

function ScoreCard({ label, value, suffix = "", icon, color, subtext }: ScoreCardProps) {
  const displayColor = color || getScoreColor(value);
  
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className={cn("text-3xl font-bold", displayColor)}>
        {value.toFixed(0)}{suffix}
      </div>
      {subtext && (
        <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
      )}
    </div>
  );
}

interface MVPDashboardProps {
  defaultBrand?: string;
  defaultCompetitors?: string[];
}

export function MVPDashboard({ 
  defaultBrand = "Juleo", 
  defaultCompetitors = ["Bumble", "Hinge", "Tinder"] 
}: MVPDashboardProps) {
  const [prompt, setPrompt] = useState("");
  const [brand, setBrand] = useState(defaultBrand);
  const [competitors, setCompetitors] = useState(defaultCompetitors.join(", "));
  
  const { loading, error, result, runFullAnalysis, reset } = useMVPAnalysis();

  const handleAnalyze = async () => {
    if (!prompt.trim() || !brand.trim()) return;
    
    const competitorList = competitors
      .split(",")
      .map(c => c.trim())
      .filter(c => c.length > 0);
    
    try {
      await runFullAnalysis(prompt, brand, competitorList);
    } catch (err) {
      console.error("Analysis failed:", err);
    }
  };

  // Get citations from the result
  const citations = result?.executePrompt?.parsed_entities?.citations || [];
  const dataforseoCitations = result?.executePrompt?.sources?.dataforseo?.parsed_entities?.citations || [];

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          AI Visibility Analysis (MVP) - DataForSEO + Groq
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Search Prompt
            </label>
            <Input
              placeholder="e.g., best dating apps in India 2025"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Your Brand
              </label>
              <Input
                placeholder="e.g., Juleo"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Competitors (comma-separated)
              </label>
              <Input
                placeholder="e.g., Bumble, Hinge, Tinder"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleAnalyze} 
              disabled={loading || !prompt.trim() || !brand.trim()}
              className="flex-1"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing (may take 10-20s)...</>
              ) : (
                <><Search className="h-4 w-4 mr-2" />Analyze Visibility</>
              )}
            </Button>
            {result && (
              <Button variant="outline" onClick={reset}>
                Clear
              </Button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <>
          {/* Score Cards */}
          <div className="grid grid-cols-4 gap-4">
            <ScoreCard
              label="Visibility Score"
              value={result.visibilityScore?.visibilityScore ?? 0}
              suffix="/100"
              icon={<Target className="h-5 w-5" />}
              color={getScoreColor(result.visibilityScore?.visibilityScore ?? 0)}
            />
            <ScoreCard
              label="Mention Score"
              value={result.visibilityScore?.scoreBreakdown.mentionScore ?? 0}
              suffix="/100"
              icon={<MessageSquare className="h-5 w-5" />}
              subtext="40% weight"
            />
            <ScoreCard
              label="Coverage Score"
              value={result.visibilityScore?.scoreBreakdown.coverageScore ?? 0}
              suffix="/100"
              icon={<BarChart3 className="h-5 w-5" />}
              subtext="25% weight"
            />
            <ScoreCard
              label="Position Score"
              value={result.visibilityScore?.scoreBreakdown.positionScore ?? 0}
              suffix="/100"
              icon={<TrendingUp className="h-5 w-5" />}
              subtext="10% weight"
            />
          </div>

          {/* Source Status Banner */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-foreground">Data Sources:</span>
              <Badge variant={result.executePrompt?.sources?.dataforseo ? "default" : "destructive"} className="gap-1">
                <Globe className="h-3 w-3" />
                DataForSEO: {result.executePrompt?.sources?.dataforseo ? "✓ Active" : "✗ Unavailable"}
              </Badge>
              <Badge variant={result.executePrompt?.sources?.groq ? "default" : "destructive"} className="gap-1">
                <MessageSquare className="h-3 w-3" />
                Groq: {result.executePrompt?.sources?.groq ? "✓ Active" : "✗ Unavailable"}
              </Badge>
              {result.executePrompt?.metadata.dataforseo_balance !== undefined && (
                <Badge variant="outline" className="gap-1">
                  <DollarSign className="h-3 w-3" />
                  Balance: ${result.executePrompt.metadata.dataforseo_balance.toFixed(2)}
                </Badge>
              )}
              {result.executePrompt?.metadata.total_cost !== undefined && result.executePrompt.metadata.total_cost > 0 && (
                <Badge variant="outline" className="gap-1">
                  Cost: ${result.executePrompt.metadata.total_cost.toFixed(4)}
                </Badge>
              )}
              <Badge variant="outline">
                {dataforseoCitations.length || citations.length} Citations
              </Badge>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Analysis Details */}
            <div className="space-y-6">
              {/* Brand Mentions */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Brand Mentions ({result.executePrompt?.parsed_entities.brandMentions.length || 0})
                </h3>
                
                {result.executePrompt?.parsed_entities.brandMentions.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <div>
                      <p className="font-medium text-foreground">Brand Not Mentioned</p>
                      <p className="text-sm text-muted-foreground">
                        {brand} was not found in the search results
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {result.executePrompt?.parsed_entities.brandMentions.map((mention, idx) => (
                      <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={
                            mention.sentiment === "positive" ? "default" :
                            mention.sentiment === "negative" ? "destructive" : "secondary"
                          }>
                            {mention.sentiment}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          "...{mention.context}..."
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Competitor Analysis */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Competitor Share of Voice
                </h3>
                
                <div className="space-y-3">
                  {/* Your Brand */}
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="font-medium">{brand}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {result.visibilityScore?.mentionCount ?? 0} mentions
                      </span>
                      <Badge variant="outline">
                        {calculateBrandSOV(result)}% SOV
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Competitors */}
                  {result.visibilityScore?.competitors.map((comp) => (
                    <div key={comp.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                        <span>{comp.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {comp.mentionCount} mentions
                        </span>
                        <Badge variant="secondary">
                          {comp.shareOfVoice}% SOV
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Citations / Search Results */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Search Results & Citations ({dataforseoCitations.length || citations.length})
                </h3>
                
                {(dataforseoCitations.length > 0 || citations.length > 0) ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {(dataforseoCitations.length > 0 ? dataforseoCitations : citations).map((citation, idx) => (
                      <div key={idx} className="p-3 bg-muted/20 rounded-lg border border-border/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {citation.position && (
                                <Badge variant="outline" className="text-xs">
                                  #{citation.position}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground truncate">
                                {citation.domain}
                              </span>
                            </div>
                            <a 
                              href={citation.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-primary hover:underline line-clamp-1"
                            >
                              {citation.title || citation.url}
                            </a>
                            {citation.snippet && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {citation.snippet}
                              </p>
                            )}
                          </div>
                          <a 
                            href={citation.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No citations found</p>
                )}
              </div>
            </div>

            {/* Right Column - AI Responses */}
            <div className="space-y-6">
              {/* DataForSEO Response */}
              {result.executePrompt?.sources?.dataforseo && (
                <div className="bg-card border border-blue-500/30 rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    DataForSEO (Google SERP + AI Overview)
                    <Badge variant="outline" className="ml-auto text-xs">
                      {result.executePrompt.sources.dataforseo.metadata.brand_mention_count} brand mentions
                    </Badge>
                  </h3>
                  <div className="max-h-72 overflow-y-auto">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-blue-500/5 p-3 rounded-lg">
                      {result.executePrompt.sources.dataforseo.raw_response || "No response"}
                    </pre>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">
                      {result.executePrompt.sources.dataforseo.metadata.citation_count} citations
                    </Badge>
                    <Badge variant="secondary">
                      {result.executePrompt.sources.dataforseo.metadata.list_count} lists
                    </Badge>
                    {result.executePrompt.sources.dataforseo.metadata.cost && (
                      <Badge variant="outline">
                        Cost: ${result.executePrompt.sources.dataforseo.metadata.cost.toFixed(4)}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Groq Response */}
              {result.executePrompt?.sources?.groq && (
                <div className="bg-card border border-purple-500/30 rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-500" />
                    Groq (Llama 3.1 AI)
                    <Badge variant="outline" className="ml-auto text-xs">
                      {result.executePrompt.sources.groq.metadata.brand_mention_count} brand mentions
                    </Badge>
                  </h3>
                  <div className="max-h-72 overflow-y-auto">
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono bg-purple-500/5 p-3 rounded-lg">
                      {result.executePrompt.sources.groq.raw_response || "No response"}
                    </pre>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">
                      {result.executePrompt.sources.groq.metadata.list_count} lists
                    </Badge>
                  </div>
                </div>
              )}

              {/* AI Summary */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  AI Summary & Insights
                </h3>
                
                <p className="text-sm text-muted-foreground mb-4">
                  {result.aiSummary?.summary || result.visibilityScore?.summary || "No summary available"}
                </p>

                {/* Key Insights */}
                {result.aiSummary?.keyInsights && result.aiSummary.keyInsights.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-foreground mb-2">Key Insights</h4>
                    <ul className="space-y-2">
                      {result.aiSummary.keyInsights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommendations */}
              {result.aiSummary?.recommendations && result.aiSummary.recommendations.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Recommendations
                  </h3>
                  
                  <ul className="space-y-3">
                    {result.aiSummary.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Combined Analysis Stats */}
              {result.executePrompt?.sources?.combined && (
                <div className="bg-card border border-green-500/30 rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-green-500" />
                    Combined Analysis
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {result.executePrompt.sources.combined.metadata.brand_mention_count}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Brand Mentions</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {result.executePrompt.sources.combined.metadata.competitor_mention_count}
                      </div>
                      <div className="text-xs text-muted-foreground">Competitor Mentions</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {result.executePrompt.sources.combined.metadata.citation_count}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Citations</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {result.executePrompt.sources.combined.metadata.list_count}
                      </div>
                      <div className="text-xs text-muted-foreground">Ranked Lists</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Metadata Footer */}
              <div className="bg-muted/20 rounded-lg p-3">
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Primary: {result.executePrompt?.metadata.data_source || "unknown"}</span>
                  <span>•</span>
                  <span>{result.executePrompt?.metadata.response_length || 0} chars</span>
                  <span>•</span>
                  <span>{result.executePrompt?.metadata.timestamp ? new Date(result.executePrompt.metadata.timestamp).toLocaleString() : ""}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
