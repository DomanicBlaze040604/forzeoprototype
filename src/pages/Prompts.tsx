import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Search as SearchIcon, ArrowUpDown, Sparkles, Loader2, CheckCircle2, XCircle, Bot, Download, Trash2, Globe, TrendingUp, ExternalLink, MapPin, History, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalyzePrompt } from "@/hooks/useAnalyzePrompt";
import { useToast } from "@/hooks/use-toast";
import { PromptSuggestions } from "@/components/prompts/PromptSuggestions";
import { useBrands } from "@/hooks/useBrands";
import { useCompetitors } from "@/hooks/useCompetitors";
import { usePrompts } from "@/hooks/usePrompts";
import { parseCSV, generateCSVTemplate } from "@/lib/csvParser";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { SerpHistoryChart } from "@/components/serp/SerpHistoryChart";

function getVisibilityColor(score: number): string {
  if (score >= 90) return "text-success";
  if (score >= 70) return "text-primary";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

const modelColors: Record<string, string> = {
  "ChatGPT": "bg-emerald-500",
  "Gemini": "bg-blue-500",
  "Claude": "bg-orange-500",
  "Perplexity": "bg-cyan-500",
};

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "JP", name: "Japan" },
  { code: "IN", name: "India" },
  { code: "NL", name: "Netherlands" },
];

const PERSONAS = [
  { id: "general", name: "General User", description: "Standard search query" },
  { id: "CTO", name: "CTO", description: "Enterprise tech decision maker" },
  { id: "Developer", name: "Developer", description: "Technical practitioner" },
  { id: "Student", name: "Student", description: "Budget-conscious learner" },
  { id: "Investor", name: "Investor", description: "Market opportunity focus" },
  { id: "Manager", name: "Manager", description: "Team collaboration focus" },
];

export default function Prompts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { isOpen } = useSidebar();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [newPromptText, setNewPromptText] = useState("");
  const [newPromptTag, setNewPromptTag] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [selectedPersona, setSelectedPersona] = useState("general");
  const [selectedPromptForAnalysis, setSelectedPromptForAnalysis] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, any>>({});
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedPromptForHistory, setSelectedPromptForHistory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { analyzePrompt, isAnalyzing } = useAnalyzePrompt();
  const { toast } = useToast();
  const { activeBrand } = useBrands();
  const { competitors } = useCompetitors(activeBrand?.id);
  const { prompts, loading, saving, addPrompt, bulkAddPrompts, deletePrompt, updatePrompt, savePromptResults } = usePrompts(activeBrand?.id);

  const competitorNames = competitors.filter((c) => c.is_active).map((c) => c.name);
  const brandName = activeBrand?.name || "FORZEO";

  const handleAddSuggestedPrompt = async (text: string, tag: string) => {
    const newPrompt = await addPrompt(text, { tag });
    if (newPrompt) {
      toast({ title: "Prompt added", description: "You can now analyze it." });
      // Auto-analyze with selected country
      handleAnalyzePrompt(newPrompt.id, text);
    }
  };

  const filteredPrompts = prompts.filter((prompt) =>
    prompt.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAnalyzePrompt = async (promptId: string, promptText: string, country?: string, persona?: string) => {
    setSelectedPromptForAnalysis(promptId);
    
    const analysisCountry = country || selectedCountry;
    const analysisPersona = persona || selectedPersona;
    const result = await analyzePrompt(promptText, brandName, undefined, competitorNames, {
      promptId,
      brandId: activeBrand?.id,
      country: analysisCountry,
      persona: analysisPersona,
    });
    
    if (result) {
      setAnalysisResults((prev) => ({
        ...prev,
        [promptId]: result,
      }));

      // Update the prompt visibility score in database
      await updatePrompt(promptId, { visibility_score: result.overall_visibility_score });

      // Save results to database
      if (result.results) {
        try {
          await savePromptResults(promptId, result.results.map((r: any) => ({
            model: r.model,
            brand_mentioned: r.brand_mentioned,
            sentiment: r.sentiment || null,
            rank: r.rank || null,
            response_text: r.response_snippet || null,
            citations: r.citations || [],
          })));
        } catch (err) {
          console.error("Failed to save results:", err);
        }
      }

      toast({
        title: "Analysis complete",
        description: `Visibility score: ${result.overall_visibility_score}%`,
      });
    }
    
    setSelectedPromptForAnalysis(null);
  };

  const handleAddPrompt = async () => {
    if (!newPromptText.trim()) return;

    const newPrompt = await addPrompt(newPromptText, { tag: newPromptTag || undefined });

    if (newPrompt) {
      setNewPromptText("");
      setNewPromptTag("");
      setShowAddDialog(false);

      toast({
        title: "Prompt added",
        description: "Analyzing with AI models...",
      });
      
      await handleAnalyzePrompt(newPrompt.id, newPrompt.text);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportErrors([]);

    try {
      const text = await file.text();
      const result = parseCSV(text);

      if (result.errors.length > 0) {
        setImportErrors(result.errors.slice(0, 5));
      }

      if (result.prompts.length > 0) {
        const imported = await bulkAddPrompts(result.prompts);
        
        // Auto-analyze first 5 prompts
        for (const prompt of imported.slice(0, 5)) {
          await handleAnalyzePrompt(prompt.id, prompt.text);
        }
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to parse CSV file", variant: "destructive" });
    } finally {
      setImporting(false);
      setShowImportDialog(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "prompts-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar />
      
      <main className={cn(
        "transition-all duration-200 ease-in-out",
        isOpen ? "pl-56" : "pl-0"
      )}>
        <Header title="Tracked Prompts" breadcrumb={[brandName, "Prompts"]} />
        
        <div className="p-6">
          {/* Actions Bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="relative w-80">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Country Selector */}
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger className="w-[160px]">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Persona Selector */}
              <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                <SelectTrigger className="w-[160px]">
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Persona" />
                </SelectTrigger>
                <SelectContent>
                  {PERSONAS.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      <div className="flex flex-col">
                        <span>{persona.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Badge variant="outline" className="text-muted-foreground">
                {prompts.length} prompts
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Prompt
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Prompt</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Prompt Text</Label>
                      <Textarea
                        placeholder="Enter your prompt to track..."
                        value={newPromptText}
                        onChange={(e) => setNewPromptText(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tag (optional)</Label>
                      <Input
                        placeholder="e.g., CRM, Sales, Marketing"
                        value={newPromptTag}
                        onChange={(e) => setNewPromptTag(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAddPrompt} className="w-full gap-2" disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Add & Analyze with AI
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Upload className="h-4 w-4" />
                    Bulk Import CSV
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Prompts from CSV</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Upload a CSV file with columns: text (required), tag (optional), location_country (optional)
                    </p>
                    <Button variant="outline" className="w-full gap-2" onClick={handleDownloadTemplate}>
                      <Download className="h-4 w-4" />
                      Download Template
                    </Button>
                    <div className="space-y-2">
                      <Label>Select CSV File</Label>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={importing}
                      />
                    </div>
                    {importing && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Importing and analyzing prompts...
                      </div>
                    )}
                    {importErrors.length > 0 && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                        <p className="text-sm font-medium text-destructive mb-2">Import Warnings:</p>
                        <ul className="text-xs text-destructive/80 space-y-1">
                          {importErrors.map((err, i) => (
                            <li key={i}>• {err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          {/* Prompts Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    <button className="flex items-center gap-1 hover:text-foreground">
                      Prompt
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    <button className="flex items-center gap-1 hover:text-foreground">
                      Visibility
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Mentions
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    <button className="flex items-center gap-1 hover:text-foreground">
                      Created
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Tag
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      <td className="px-4 py-4" colSpan={6}>
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                ) : filteredPrompts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                      {prompts.length === 0 ? "No prompts yet. Add your first prompt to start tracking." : "No prompts match your search."}
                    </td>
                  </tr>
                ) : (
                  filteredPrompts.map((prompt, index) => {
                    const mentions = prompt.results.filter(r => r.brand_mentioned);
                    return (
                      <motion.tr
                        key={prompt.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.02 * index }}
                        className="border-b border-border last:border-0 transition-colors hover:bg-secondary/20"
                      >
                        <td className="px-4 py-4 max-w-md">
                          <span className="text-sm font-medium text-foreground line-clamp-2">
                            {prompt.text}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn("text-sm font-semibold", getVisibilityColor(prompt.visibility_score || 0))}>
                            {prompt.visibility_score || 0}%
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            {mentions.length > 0 ? mentions.slice(0, 4).map((result, idx) => (
                              <div
                                key={idx}
                                className={cn("h-5 w-5 rounded-full flex items-center justify-center", modelColors[result.model] || "bg-gray-500")}
                                title={result.model}
                              >
                                <Bot className="h-3 w-3 text-white" />
                              </div>
                            )) : (
                              <span className="text-xs text-muted-foreground">
                                {prompt.results.length > 0 ? "Not mentioned" : "Not analyzed"}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          {format(new Date(prompt.created_at), "MMM d, yyyy")}
                        </td>
                        <td className="px-4 py-4">
                          {prompt.tag ? (
                            <Badge variant="secondary" className="text-xs">
                              {prompt.tag}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleAnalyzePrompt(prompt.id, prompt.text)}
                              disabled={isAnalyzing && selectedPromptForAnalysis === prompt.id}
                            >
                              {isAnalyzing && selectedPromptForAnalysis === prompt.id ? (
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="View SERP History"
                              onClick={() => {
                                setSelectedPromptForHistory(prompt.id);
                                setShowHistory(true);
                              }}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => deletePrompt(prompt.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </motion.div>

          {/* Analysis Results Panel */}
          <AnimatePresence>
            {Object.keys(analysisResults).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-6 rounded-xl border border-border bg-card p-6"
              >
                <h3 className="mb-4 text-lg font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Latest Analysis Results
                </h3>
                
                {Object.entries(analysisResults).slice(-1).map(([promptId, result]) => {
                  const prompt = prompts.find((p) => p.id === promptId);
                  return (
                    <div key={promptId} className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Prompt: <span className="text-foreground">{prompt?.text}</span>
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {result.results?.map((r: any, idx: number) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-border bg-secondary/30 p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={cn("h-6 w-6 rounded-full flex items-center justify-center", modelColors[r.model] || "bg-gray-500")}>
                                  <Bot className="h-3 w-3 text-white" />
                                </div>
                                <span className="font-medium text-foreground">{r.model}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {r.brand_mentioned ? (
                                  <Badge variant="outline" className="text-xs border-success text-success">
                                    Mentioned {r.rank ? `#${r.rank}` : ''}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs border-destructive text-destructive">
                                    Not mentioned
                                  </Badge>
                                )}
                                {r.sentiment && r.brand_mentioned && (
                                  <Badge 
                                    variant="secondary" 
                                    className={cn("text-xs", {
                                      "bg-success/20 text-success": r.sentiment === 'positive',
                                      "bg-warning/20 text-warning": r.sentiment === 'neutral',
                                      "bg-destructive/20 text-destructive": r.sentiment === 'negative',
                                    })}
                                  >
                                    {r.sentiment}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {/* Show actual AI response snippet */}
                            {r.response_snippet && (
                              <div className="rounded-lg bg-background/50 p-3 border border-border/50">
                                <p className="text-xs text-muted-foreground mb-1">AI Response Preview:</p>
                                <p className="text-sm text-foreground line-clamp-4">
                                  {r.response_snippet}
                                </p>
                              </div>
                            )}
                            
                            {/* Show competitors mentioned in this response */}
                            {r.competitors_in_response?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                <span className="text-xs text-muted-foreground">Competitors mentioned:</span>
                                {r.competitors_in_response.map((comp: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {comp}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* SERP Data Section */}
                      {result.serp_data && (
                        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" />
                            Google SERP Analysis
                          </h4>
                          
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="rounded-lg bg-background/50 p-3 border border-border">
                              <p className="text-xs text-muted-foreground mb-1">Brand in SERP</p>
                              <div className="flex items-center gap-2">
                                {result.serp_data.brand_in_serp ? (
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                                <span className="font-medium text-foreground">
                                  {result.serp_data.brand_in_serp ? "Yes" : "No"}
                                </span>
                              </div>
                            </div>
                            
                            <div className="rounded-lg bg-background/50 p-3 border border-border">
                              <p className="text-xs text-muted-foreground mb-1">SERP Position</p>
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                <span className="font-medium text-foreground">
                                  {result.serp_data.serp_position !== null 
                                    ? `#${result.serp_data.serp_position}` 
                                    : "Not ranked"}
                                </span>
                              </div>
                            </div>
                            
                            <div className="rounded-lg bg-background/50 p-3 border border-border">
                              <p className="text-xs text-muted-foreground mb-1">Competitor Positions</p>
                              <div className="flex flex-wrap gap-1">
                                {result.serp_data.competitor_serp_positions?.length > 0 ? (
                                  result.serp_data.competitor_serp_positions.slice(0, 3).map((c: any, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {c.name}: #{c.position}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">None found</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {result.serp_data.ai_overview && (
                            <div className="rounded-lg bg-background/50 p-3 border border-border mb-3">
                              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <Sparkles className="h-3 w-3" />
                                Google AI Overview
                              </p>
                              <p className="text-sm text-foreground line-clamp-3">
                                {result.serp_data.ai_overview}
                              </p>
                            </div>
                          )}
                          
                          {result.serp_data.top_organic_results?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">Top Organic Results:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {result.serp_data.top_organic_results.slice(0, 4).map((r: any, i: number) => (
                                  <a
                                    key={i}
                                    href={r.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-2 rounded-lg bg-background/30 p-2 border border-border/50 hover:border-primary/50 transition-colors group"
                                  >
                                    <span className="text-xs text-muted-foreground">#{r.position}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-foreground truncate group-hover:text-primary">
                                        {r.title}
                                      </p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {r.snippet?.substring(0, 60)}...
                                      </p>
                                    </div>
                                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {result.recommendations?.length > 0 && (
                        <div className="mt-4 rounded-lg border border-border bg-secondary/20 p-4">
                          <h4 className="text-sm font-medium text-foreground mb-2">Recommendations</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {result.recommendations.map((rec: string, idx: number) => (
                              <li key={idx}>• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* AI Prompt Suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <PromptSuggestions
              onAddPrompt={handleAddSuggestedPrompt}
              brandName={brandName}
              competitors={competitorNames}
            />
          </motion.div>

          {/* SERP History Dialog */}
          <Dialog open={showHistory} onOpenChange={setShowHistory}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  SERP Position History
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {selectedPromptForHistory && (
                  <SerpHistoryChart 
                    promptId={selectedPromptForHistory} 
                    brandId={activeBrand?.id}
                    brandName={brandName}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}
