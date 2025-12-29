/**
 * Forzeo Client Dashboard - Main Component
 * 
 * A full-featured AI Visibility Analytics dashboard with:
 * - Multi-tenant client management
 * - Unlimited prompts with import/export
 * - Real-time audit execution
 * - Cost tracking
 * - 5 Tabs: Summary, Prompts, Citations, Content, Sources
 * 
 * @requires useClientDashboard hook
 * @requires shadcn/ui components
 * @requires lucide-react icons
 */

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  BarChart3, FileText, Globe, Play, Plus, Loader2, ChevronDown, X,
  CheckCircle, XCircle, ExternalLink, TrendingUp, Users, Award,
  Download, Upload, Settings, Tag, Trash2, RefreshCw, DollarSign,
  AlertTriangle, Lightbulb, Edit, Copy, MoreVertical, Link2, Sparkles,
  Wand2, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from "@/components/ui/sheet";
import { 
  useClientDashboard, AI_MODELS, type AuditResult
} from "./useClientDashboard";

// ============================================
// MAIN COMPONENT
// ============================================

export default function ClientDashboard() {
  // Get all state and actions from the hook
  const {
    clients, selectedClient, prompts, auditResults, summary, sourceSummary, costBreakdown,
    selectedModels, loading, loadingPromptId, error,
    addClient, updateClient, deleteClient, switchClient, setSelectedModels,
    runAudit, runFullAudit, rerunAudit, clearResults,
    addCustomPrompt, addMultiplePrompts, deletePrompt, clearAllPrompts,
    updateBrandTags, updateCompetitors,
    exportToCSV, exportPrompts, exportFullReport, importData,
    generatePromptsFromKeywords, generateContent, getAllCitations,
    INDUSTRY_PRESETS: industries, LOCATION_CODES: locations
  } = useClientDashboard();

  // ----------------------------------------
  // LOCAL STATE
  // ----------------------------------------
  
  // Prompt input
  const [newPrompt, setNewPrompt] = useState("");
  const [bulkPrompts, setBulkPrompts] = useState("");
  
  // Settings input
  const [newTag, setNewTag] = useState("");
  const [newCompetitor, setNewCompetitor] = useState("");
  
  // View options
  const [viewMode, setViewMode] = useState<"domains" | "urls">("domains");
  
  // Dialog/Sheet state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // AI Features state
  const [keywordsInput, setKeywordsInput] = useState("");
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [contentTopic, setContentTopic] = useState("");
  const [contentType, setContentType] = useState("article");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatingContent, setGeneratingContent] = useState(false);

  // Get all citations for the Citations tab
  const allCitations = getAllCitations();

  // New client form state
  const [newClientForm, setNewClientForm] = useState({
    name: "", brand_name: "", target_region: "United States", industry: "Custom", competitors: ""
  });

  // ----------------------------------------
  // EVENT HANDLERS
  // ----------------------------------------

  // Add single prompt
  const handleAddPrompt = async () => {
    if (newPrompt.trim()) {
      await addCustomPrompt(newPrompt.trim());
      setNewPrompt("");
    }
  };

  // Add multiple prompts from textarea
  const handleBulkAdd = () => {
    if (bulkPrompts.trim()) {
      const lines = bulkPrompts.split("\n").filter(l => l.trim().length > 3);
      addMultiplePrompts(lines);
      setBulkPrompts("");
    }
  };

  // Add brand tag
  const handleAddTag = () => {
    if (newTag.trim() && selectedClient) {
      updateBrandTags([...selectedClient.brand_tags, newTag.trim()]);
      setNewTag("");
    }
  };

  // Add competitor
  const handleAddCompetitor = () => {
    if (newCompetitor.trim() && selectedClient) {
      updateCompetitors([...selectedClient.competitors, newCompetitor.trim()]);
      setNewCompetitor("");
    }
  };

  // Import from file
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        importData(content, file.name);
      };
      reader.readAsText(file);
      e.target.value = "";
    }
  };

  // Import from pasted text
  const handleTextImport = () => {
    if (importText.trim()) {
      importData(importText);
      setImportText("");
      setImportOpen(false);
    }
  };

  // Generate prompts from keywords using AI
  const handleGeneratePrompts = async () => {
    if (!keywordsInput.trim()) return;
    setGeneratingPrompts(true);
    try {
      const generated = await generatePromptsFromKeywords(keywordsInput);
      if (generated.length > 0) {
        addMultiplePrompts(generated);
        setKeywordsInput("");
      }
    } finally {
      setGeneratingPrompts(false);
    }
  };

  // Generate content using AI
  const handleGenerateContent = async () => {
    if (!contentTopic.trim()) return;
    setGeneratingContent(true);
    setGeneratedContent("");
    try {
      const content = await generateContent(contentTopic, contentType);
      if (content) {
        setGeneratedContent(content);
      }
    } finally {
      setGeneratingContent(false);
    }
  };

  // Copy generated content to clipboard
  const copyContent = () => {
    navigator.clipboard.writeText(generatedContent);
  };

  // Download generated content as file
  const downloadContent = () => {
    const blob = new Blob([generatedContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contentTopic.replace(/\s+/g, "-").toLowerCase()}-content.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Create new client
  const handleCreateClient = () => {
    if (!newClientForm.name.trim()) return;
    
    const competitors = newClientForm.competitors.split(",").map(c => c.trim()).filter(Boolean);
    addClient({
      name: newClientForm.name,
      brand_name: newClientForm.brand_name || newClientForm.name,
      target_region: newClientForm.target_region,
      location_code: locations[newClientForm.target_region] || 2840,
      industry: newClientForm.industry,
      competitors: competitors.length > 0 ? competitors : industries[newClientForm.industry]?.competitors || [],
    });
    
    setNewClientForm({ name: "", brand_name: "", target_region: "United States", industry: "Custom", competitors: "" });
    setAddClientOpen(false);
  };

  // Toggle model selection
  const toggleModel = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      if (selectedModels.length > 1) setSelectedModels(selectedModels.filter(m => m !== modelId));
    } else {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  // Calculate pending prompts and estimated cost
  const pendingPrompts = prompts.filter(p => !auditResults.find(r => r.prompt_id === p.id)).length;
  const estimatedCost = pendingPrompts * selectedModels.reduce((sum, m) => sum + (AI_MODELS.find(am => am.id === m)?.costPerQuery || 0), 0);

  // ----------------------------------------
  // RENDER
  // ----------------------------------------

  return (
    <div className="min-h-screen bg-background p-6">
      {/* ========== HEADER ========== */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Forzeo GEO Dashboard</h1>
          
          {/* Client Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedClient?.primary_color }} />
                {selectedClient?.name || "Select Client"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {clients.map(client => (
                <DropdownMenuItem key={client.id} className="flex items-center justify-between" onClick={() => switchClient(client)}>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: client.primary_color }} />
                    <span>{client.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{client.target_region}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAddClientOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add New Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Client Actions Menu */}
          {selectedClient && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setEditClientOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit Client
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const newClient = addClient({ ...selectedClient, name: `${selectedClient.name} (Copy)` });
                  switchClient(newClient);
                }}>
                  <Copy className="h-4 w-4 mr-2" /> Duplicate Client
                </DropdownMenuItem>
                {clients.length > 1 && (
                  <DropdownMenuItem className="text-destructive" onClick={() => deleteClient(selectedClient.id)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Client
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right side: Cost, Settings, Run button */}
        <div className="flex items-center gap-2">
          {/* Total Cost Display */}
          {costBreakdown.total > 0 && (
            <Badge variant="outline" className="gap-1">
              <DollarSign className="h-3 w-3" />
              Total: ${costBreakdown.total.toFixed(4)}
            </Badge>
          )}

          {/* Settings Sheet */}
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon"><Settings className="h-4 w-4" /></Button>
            </SheetTrigger>
            <SheetContent className="w-[420px] overflow-y-auto">
              <SheetHeader><SheetTitle>Settings & Configuration</SheetTitle></SheetHeader>
              
              <div className="space-y-6 mt-6">
                {/* Brand Tags Section */}
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Tag className="h-4 w-4" /> Brand Tags</Label>
                  <p className="text-xs text-muted-foreground mb-2">Alternative names to detect in AI responses</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedClient?.brand_tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => updateBrandTags(selectedClient.brand_tags.filter(t => t !== tag))} />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Add tag..." value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddTag()} />
                    <Button size="sm" onClick={handleAddTag}>Add</Button>
                  </div>
                </div>

                {/* Competitors Section */}
                <div>
                  <Label className="flex items-center gap-2 mb-2"><Users className="h-4 w-4" /> Competitors</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedClient?.competitors.map(comp => (
                      <Badge key={comp} variant="outline" className="gap-1">
                        {comp}
                        <X className="h-3 w-3 cursor-pointer hover:text-destructive" onClick={() => updateCompetitors(selectedClient.competitors.filter(c => c !== comp))} />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Add competitor..." value={newCompetitor} onChange={e => setNewCompetitor(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddCompetitor()} />
                    <Button size="sm" onClick={handleAddCompetitor}>Add</Button>
                  </div>
                </div>

                {/* AI Models Section */}
                <div>
                  <Label className="mb-2 block">AI Models</Label>
                  <div className="space-y-2">
                    {AI_MODELS.map(model => (
                      <div key={model.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <Checkbox id={model.id} checked={selectedModels.includes(model.id)} onCheckedChange={() => toggleModel(model.id)} />
                          <label htmlFor={model.id} className="flex items-center gap-2 text-sm cursor-pointer">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: model.color }} />
                            {model.name}
                          </label>
                        </div>
                        <span className="text-xs text-muted-foreground">${model.costPerQuery.toFixed(3)}/query</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Export Section */}
                <div>
                  <Label className="mb-2 block">Export Data</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={exportPrompts}><Download className="h-4 w-4 mr-1" /> Prompts</Button>
                    <Button variant="outline" size="sm" onClick={exportToCSV} disabled={auditResults.length === 0}><Download className="h-4 w-4 mr-1" /> Results CSV</Button>
                    <Button variant="outline" size="sm" onClick={exportFullReport} disabled={auditResults.length === 0} className="col-span-2"><Download className="h-4 w-4 mr-1" /> Full Report</Button>
                  </div>
                </div>

                {/* Import Section */}
                <div>
                  <Label className="mb-2 block">Import Data</Label>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" /> Import File (JSON/CSV/TXT)
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setImportOpen(true)}>
                      <FileText className="h-4 w-4 mr-2" /> Paste Text/Data
                    </Button>
                    <input ref={fileInputRef} type="file" accept=".json,.csv,.txt" className="hidden" onChange={handleFileImport} />
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-4 border-t">
                  <Label className="mb-2 block text-destructive">Danger Zone</Label>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/50" onClick={clearAllPrompts} disabled={prompts.length === 0}>
                      <Trash2 className="h-4 w-4 mr-2" /> Clear All Prompts
                    </Button>
                    <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/50" onClick={clearResults} disabled={auditResults.length === 0}>
                      <Trash2 className="h-4 w-4 mr-2" /> Clear All Results
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Badge variant="outline">{prompts.length} Prompts</Badge>
          
          {/* Run Audit Button */}
          <Button onClick={runFullAudit} disabled={loading || pendingPrompts === 0}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            {loading ? `${auditResults.length}/${prompts.length}` : pendingPrompts > 0 ? `Run ${pendingPrompts}` : "Done"}
            {pendingPrompts > 0 && !loading && estimatedCost > 0 && <span className="ml-1 text-xs opacity-70">(~${estimatedCost.toFixed(3)})</span>}
          </Button>
        </div>
      </div>

      {/* ========== MODEL & COST BAR ========== */}
      <div className="flex items-center justify-between mb-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex flex-wrap gap-2">
          {selectedModels.map(modelId => {
            const model = AI_MODELS.find(m => m.id === modelId);
            const modelCost = costBreakdown.by_model[modelId] || 0;
            return model ? (
              <Badge key={modelId} variant="outline" style={{ borderColor: model.color, color: model.color }} className="gap-1">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: model.color }} />
                {model.name}
                {modelCost > 0 && <span className="opacity-70">${modelCost.toFixed(3)}</span>}
              </Badge>
            ) : null;
          })}
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedClient?.industry} • {selectedClient?.target_region}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* NOTE: Dialogs and main Tabs content would continue here */}
      {/* For brevity, see the full implementation in src/pages/ClientDashboard.tsx */}
      
      {/* Placeholder for the rest of the component */}
      <div className="text-center py-12 text-muted-foreground">
        <p>See src/pages/ClientDashboard.tsx for the complete implementation</p>
        <p className="text-sm mt-2">Includes: Add/Edit Client dialogs, Import dialog, and all 5 tabs</p>
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================

/**
 * Metric card for summary display
 */
function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
    </div>
  );
}

/**
 * Modal for viewing detailed prompt analysis
 */
function PromptDetailModal({ result, brandName }: { result: AuditResult; brandName: string }) {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  
  return (
    <div className="space-y-6">
      {/* Header with summary */}
      <div className="p-4 bg-muted/30 rounded-lg">
        <p className="font-medium text-lg">{result.prompt_text}</p>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>SOV: <strong className={result.summary.share_of_voice >= 50 ? "text-green-500" : result.summary.share_of_voice >= 25 ? "text-yellow-500" : "text-red-500"}>{result.summary.share_of_voice}%</strong></span>
          {result.summary.average_rank && <span>Rank: <strong>#{result.summary.average_rank}</strong></span>}
          <span>Citations: <strong>{result.summary.total_citations}</strong></span>
          <span>Cost: <strong>${result.summary.total_cost.toFixed(4)}</strong></span>
        </div>
      </div>

      {/* Model Results - expandable */}
      <div className="space-y-4">
        {result.model_results.map((mr) => {
          const model = AI_MODELS.find(m => m.id === mr.model);
          const isExpanded = expandedModel === mr.model;
          
          return (
            <div key={mr.model} className="border border-border rounded-lg overflow-hidden">
              <div 
                className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/20" 
                style={{ backgroundColor: (model?.color || "#666") + "10" }}
                onClick={() => setExpandedModel(isExpanded ? null : mr.model)}
              >
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: model?.color || "#666" }} />
                  <span className="font-medium">{mr.model_name}</span>
                  {!mr.success ? (
                    <Badge variant="outline" className="text-yellow-500">Error</Badge>
                  ) : mr.brand_mentioned ? (
                    <Badge className="bg-green-500/20 text-green-500 text-xs">
                      Visible {mr.brand_mention_count > 1 && `(×${mr.brand_mention_count})`}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-500">Not Visible</Badge>
                  )}
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
              </div>
              
              {isExpanded && (
                <div className="p-4 border-t border-border bg-muted/10">
                  {/* Response preview */}
                  <div className="mb-4">
                    <Label className="text-xs text-muted-foreground">Response ({mr.response_length} chars)</Label>
                    <pre className="mt-1 p-3 bg-background rounded text-xs max-h-48 overflow-auto whitespace-pre-wrap">
                      {mr.raw_response || "No response"}
                    </pre>
                  </div>
                  
                  {/* Citations */}
                  {mr.citations.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Citations ({mr.citations.length})</Label>
                      <div className="mt-1 space-y-1">
                        {mr.citations.slice(0, 5).map((c, idx) => (
                          <a key={idx} href={c.url} target="_blank" rel="noopener noreferrer" 
                             className="block text-xs text-primary hover:underline truncate">
                            {c.title || c.url}
                          </a>
                        ))}
                        {mr.citations.length > 5 && (
                          <span className="text-xs text-muted-foreground">+{mr.citations.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
