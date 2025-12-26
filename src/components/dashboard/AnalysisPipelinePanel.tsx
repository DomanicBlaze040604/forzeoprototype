import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAnalysisPipeline } from "@/hooks/useAnalysisPipeline";
import { useBrands } from "@/hooks/useBrands";
import { useCompetitors } from "@/hooks/useCompetitors";
import { 
  Play, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  Quote,
  Users,
  Zap
} from "lucide-react";

export function AnalysisPipelinePanel() {
  const [prompt, setPrompt] = useState("");
  const [bulkPrompts, setBulkPrompts] = useState("");
  const [config, setConfig] = useState({
    engines: ["google_sge", "bing_copilot"],
    includeReddit: true,
    includeQuora: true,
    generateAnswers: true,
    detectMentions: true,
    calculateScores: true,
  });
  
  const { loading, results, runPipeline, runBatchPipeline, clearResults } = useAnalysisPipeline();
  const { brands } = useBrands();
  const { competitors } = useCompetitors();
  
  const primaryBrand = brands.find(b => b.is_primary) || brands[0];
  
  const handleRunSingle = async () => {
    if (!prompt.trim() || !primaryBrand) return;
    
    await runPipeline(
      prompt,
      { name: primaryBrand.name, aliases: [], domains: [] },
      competitors.map(c => ({ name: c.name })),
      config
    );
    setPrompt("");
  };
  
  const handleRunBatch = async () => {
    if (!bulkPrompts.trim() || !primaryBrand) return;
    
    const prompts = bulkPrompts.split("\n").filter(p => p.trim());
    await runBatchPipeline(
      prompts,
      { name: primaryBrand.name, aliases: [], domains: [] },
      competitors.map(c => ({ name: c.name })),
      config
    );
    setBulkPrompts("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "partial": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "failed": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Analysis Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="single">
          <TabsList>
            <TabsTrigger value="single">Single Prompt</TabsTrigger>
            <TabsTrigger value="batch">Batch Analysis</TabsTrigger>
            <TabsTrigger value="config">Configuration</TabsTrigger>
          </TabsList>
          
          <TabsContent value="single" className="space-y-4">
            <div className="space-y-2">
              <Label>Prompt to Analyze</Label>
              <div className="flex gap-2">
                <Input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a search prompt..."
                  onKeyDown={(e) => e.key === "Enter" && handleRunSingle()}
                />
                <Button onClick={handleRunSingle} disabled={loading || !prompt.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="batch" className="space-y-4">
            <div className="space-y-2">
              <Label>Prompts (one per line)</Label>
              <Textarea
                value={bulkPrompts}
                onChange={(e) => setBulkPrompts(e.target.value)}
                placeholder="best CRM software&#10;how to choose a CRM&#10;CRM vs spreadsheet"
                rows={5}
              />
              <Button onClick={handleRunBatch} disabled={loading || !bulkPrompts.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Run Batch Analysis
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="config" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label>Include Reddit</Label>
                <Switch
                  checked={config.includeReddit}
                  onCheckedChange={(v) => setConfig(c => ({ ...c, includeReddit: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Include Quora</Label>
                <Switch
                  checked={config.includeQuora}
                  onCheckedChange={(v) => setConfig(c => ({ ...c, includeQuora: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Generate AI Answers</Label>
                <Switch
                  checked={config.generateAnswers}
                  onCheckedChange={(v) => setConfig(c => ({ ...c, generateAnswers: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Detect Mentions</Label>
                <Switch
                  checked={config.detectMentions}
                  onCheckedChange={(v) => setConfig(c => ({ ...c, detectMentions: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Calculate Scores</Label>
                <Switch
                  checked={config.calculateScores}
                  onCheckedChange={(v) => setConfig(c => ({ ...c, calculateScores: v }))}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Recent Results</h3>
              <Button variant="ghost" size="sm" onClick={clearResults}>Clear</Button>
            </div>
            
            <div className="space-y-3">
              {results.slice(0, 5).map((result) => (
                <Card key={result.promptId} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-medium truncate max-w-md">{result.prompt}</span>
                      </div>
                      
                      {result.scores && (
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-blue-500" />
                            <span>AVS: {result.scores.aiVisibilityScore}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Quote className="h-3 w-3 text-green-500" />
                            <span>Citations: {result.scores.citationScore}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-purple-500" />
                            <span>SOV: {result.scores.promptShareOfVoice}%</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        {result.mentionResults?.map((m: any) => (
                          <Badge 
                            key={m.engine} 
                            variant={m.mentioned ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {m.engine}: {m.mentioned ? "Mentioned" : "Not Found"}
                          </Badge>
                        ))}
                      </div>
                      
                      {result.errors.length > 0 && (
                        <div className="text-sm text-red-500">
                          {result.errors.length} error(s)
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {result.processingTime}ms
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
