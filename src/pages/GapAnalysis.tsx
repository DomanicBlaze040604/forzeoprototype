import { useState, useEffect } from "react";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import { 
  Search, 
  Download, 
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Copy,
  Check,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useGapAnalysis, GapPrompt, ContentBrief } from "@/hooks/useGapAnalysis";

export default function GapAnalysis() {
  const { isOpen } = useSidebar();
  const { toast } = useToast();
  const { gapPrompts, loading, error, generating, refresh, generateContentBrief } = useGapAnalysis();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLLM, setSelectedLLM] = useState("all");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [selectedPrompt, setSelectedPrompt] = useState<GapPrompt | null>(null);
  const [contentBrief, setContentBrief] = useState<ContentBrief | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingBrief, setLoadingBrief] = useState(false);

  const filteredPrompts = gapPrompts.filter(prompt => {
    const matchesSearch = prompt.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLLM = selectedLLM === "all" || prompt.llmsMissing.some(llm => 
      llm.toLowerCase().includes(selectedLLM.toLowerCase())
    );
    const matchesTopic = selectedTopic === "all" || prompt.topic === selectedTopic;
    return matchesSearch && matchesLLM && matchesTopic;
  });

  const formatVolume = (volume: number) => {
    return new Intl.NumberFormat('en-IN').format(volume);
  };

  const handleOpenBrief = async (prompt: GapPrompt) => {
    setSelectedPrompt(prompt);
    setLoadingBrief(true);
    setContentBrief(null);
    
    const brief = await generateContentBrief(prompt.prompt, prompt.topic);
    setContentBrief(brief);
    setLoadingBrief(false);
  };

  const handleCopyBrief = () => {
    if (contentBrief && selectedPrompt) {
      const text = `Target Prompt: "${selectedPrompt.prompt}"

Title: ${contentBrief.title}

Content Brief:
${contentBrief.description}

Target Keywords: ${contentBrief.targetKeywords.join(", ")}
Recommended Format: ${contentBrief.contentType}`;
      
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Brief copied!",
        description: "Content brief has been copied to clipboard.",
      });
    }
  };

  const uniqueTopics = [...new Set(gapPrompts.map(p => p.topic))];
  const uniqueLLMs = [...new Set(gapPrompts.flatMap(p => p.llmsMissing))];
  const totalVolume = filteredPrompts.reduce((sum, p) => sum + p.estimatedVolume, 0);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn("transition-all duration-200 ease-in-out", isOpen ? "ml-56" : "ml-0")}>
        <Header title="Gap Analysis" />
        <main className="p-6">
          {/* Page Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-2">Content Gap Analysis</h1>
              <p className="text-muted-foreground">
                Your brand didn't appear in the response to the prompts below, for at least one LLM
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

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">
                    {loading ? "..." : filteredPrompts.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Gap Prompts</p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">
                    {loading ? "..." : formatVolume(totalVolume)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Est. Volume</p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Lightbulb className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-foreground">
                    {loading ? "..." : uniqueTopics.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Topics Affected</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-card border border-border rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search prompts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={selectedLLM} onValueChange={setSelectedLLM}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All LLMs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LLMs</SelectItem>
                  {uniqueLLMs.map(llm => (
                    <SelectItem key={llm} value={llm}>{llm}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {uniqueTopics.map(topic => (
                    <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground">
                {filteredPrompts.length} prompts
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>

          {/* Gap Prompts Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Prompts That Didn't Yield Your Brand</h2>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPrompts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mb-4 opacity-30" />
                <p>No gap prompts found</p>
                <p className="text-sm">Your brand appears in all analyzed prompts!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">PROMPT</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">EST. VOLUME</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">LLMS THAT DIDN'T MENTION BRAND</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrompts.map((prompt) => (
                      <tr key={prompt.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="text-foreground font-medium">{prompt.prompt}</p>
                            <p className="text-sm text-muted-foreground">{prompt.topic}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-foreground font-mono">{formatVolume(prompt.estimatedVolume)}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {prompt.llmsMissing.map(llm => (
                              <Badge key={llm} variant="secondary" className="text-xs">
                                {llm}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <Button 
                            size="sm" 
                            onClick={() => handleOpenBrief(prompt)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            <Lightbulb className="h-4 w-4 mr-2" />
                            Suggested Content
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Content Brief Modal */}
      <Dialog open={!!selectedPrompt} onOpenChange={() => setSelectedPrompt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Suggested Content Brief
            </DialogTitle>
          </DialogHeader>
          {selectedPrompt && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The following brief is for content that directly addresses the prompt, which is what models are looking for.
              </p>
              
              {loadingBrief ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Generating content brief...</span>
                </div>
              ) : contentBrief ? (
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Target Prompt</p>
                    <p className="text-foreground font-medium">"{selectedPrompt.prompt}"</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Suggested Title</p>
                    <p className="text-foreground font-semibold">{contentBrief.title}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Content Description</p>
                    <p className="text-foreground text-sm leading-relaxed">{contentBrief.description}</p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Target Keywords</p>
                    <div className="flex flex-wrap gap-1">
                      {contentBrief.targetKeywords.map((kw, i) => (
                        <Badge key={i} variant="outline">{kw}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Recommended Format</p>
                    <Badge>{contentBrief.contentType}</Badge>
                  </div>
                </div>
              ) : null}

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Tip:</strong> Use the Content Generation page to create full articles based on this brief.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedPrompt(null)}>
                  Close
                </Button>
                <Button onClick={handleCopyBrief} disabled={!contentBrief}>
                  {copied ? (
                    <><Check className="h-4 w-4 mr-2" />Copied!</>
                  ) : (
                    <><Copy className="h-4 w-4 mr-2" />Copy Brief</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
