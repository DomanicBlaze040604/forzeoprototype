/**
 * Forzeo Client Dashboard - Full Featured GEO Analytics
 * 
 * Features:
 * - Client management (add/edit/delete)
 * - Unlimited prompts with multi-format import
 * - Cost tracking per search
 * - 4 Tabs: Summary, Prompts, Citations, Content
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
} from "@/hooks/useClientDashboard";

export default function ClientDashboard() {
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

  const [newPrompt, setNewPrompt] = useState("");
  const [bulkPrompts, setBulkPrompts] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newCompetitor, setNewCompetitor] = useState("");
  const [viewMode, setViewMode] = useState<"domains" | "urls">("domains");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
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

  const handleAddPrompt = async () => {
    if (newPrompt.trim()) {
      await addCustomPrompt(newPrompt.trim());
      setNewPrompt("");
    }
  };

  const handleBulkAdd = () => {
    if (bulkPrompts.trim()) {
      const lines = bulkPrompts.split("\n").filter(l => l.trim().length > 3);
      addMultiplePrompts(lines);
      setBulkPrompts("");
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && selectedClient) {
      updateBrandTags([...selectedClient.brand_tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleAddCompetitor = () => {
    if (newCompetitor.trim() && selectedClient) {
      updateCompetitors([...selectedClient.competitors, newCompetitor.trim()]);
      setNewCompetitor("");
    }
  };

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

  const handleTextImport = () => {
    if (importText.trim()) {
      importData(importText);
      setImportText("");
      setImportOpen(false);
    }
  };

  // AI Prompt Generation from keywords
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

  // Content Generation
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

  // Copy content to clipboard
  const copyContent = () => {
    navigator.clipboard.writeText(generatedContent);
  };

  // Download content as file
  const downloadContent = () => {
    const blob = new Blob([generatedContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contentTopic.replace(/\s+/g, "-").toLowerCase()}-content.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const toggleModel = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      if (selectedModels.length > 1) setSelectedModels(selectedModels.filter(m => m !== modelId));
    } else {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  const pendingPrompts = prompts.filter(p => !auditResults.find(r => r.prompt_id === p.id)).length;
  const estimatedCost = pendingPrompts * selectedModels.reduce((sum, m) => sum + (AI_MODELS.find(am => am.id === m)?.costPerQuery || 0), 0);

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-foreground">Forzeo GEO Dashboard</h1>
          
          {/* Client Selector with Management */}
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

          {/* Client Actions */}
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

        <div className="flex items-center gap-2">
          {/* Cost Display */}
          {costBreakdown.total > 0 && (
            <Badge variant="outline" className="gap-1">
              <DollarSign className="h-3 w-3" />
              Total: ${costBreakdown.total.toFixed(4)}
            </Badge>
          )}

          {/* Settings */}
          <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon"><Settings className="h-4 w-4" /></Button>
            </SheetTrigger>
            <SheetContent className="w-[420px] overflow-y-auto">
              <SheetHeader><SheetTitle>Settings & Configuration</SheetTitle></SheetHeader>
              
              <div className="space-y-6 mt-6">
                {/* Brand Tags */}
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

                {/* Competitors */}
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

                {/* AI Models */}
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

                {/* Export Options */}
                <div>
                  <Label className="mb-2 block">Export Data</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={exportPrompts}><Download className="h-4 w-4 mr-1" /> Prompts</Button>
                    <Button variant="outline" size="sm" onClick={exportToCSV} disabled={auditResults.length === 0}><Download className="h-4 w-4 mr-1" /> Results CSV</Button>
                    <Button variant="outline" size="sm" onClick={exportFullReport} disabled={auditResults.length === 0} className="col-span-2"><Download className="h-4 w-4 mr-1" /> Full Report</Button>
                  </div>
                </div>

                {/* Import Options */}
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
          
          <Button onClick={runFullAudit} disabled={loading || pendingPrompts === 0}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
            {loading ? `${auditResults.length}/${prompts.length}` : pendingPrompts > 0 ? `Run ${pendingPrompts}` : "Done"}
            {pendingPrompts > 0 && !loading && estimatedCost > 0 && <span className="ml-1 text-xs opacity-70">(~${estimatedCost.toFixed(3)})</span>}
          </Button>
        </div>
      </div>

      {/* Model & Cost Bar */}
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

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Add Client Dialog */}
      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>Create a new client to track their AI visibility</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client Name *</Label>
                <Input placeholder="e.g., Acme Corp" value={newClientForm.name} onChange={e => setNewClientForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <Label>Brand Name</Label>
                <Input placeholder="e.g., Acme" value={newClientForm.brand_name} onChange={e => setNewClientForm(f => ({ ...f, brand_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Industry</Label>
                <Select value={newClientForm.industry} onValueChange={v => setNewClientForm(f => ({ ...f, industry: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(industries).map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Region</Label>
                <Select value={newClientForm.target_region} onValueChange={v => setNewClientForm(f => ({ ...f, target_region: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(locations).map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Competitors (comma-separated)</Label>
              <Input placeholder="e.g., Competitor A, Competitor B" value={newClientForm.competitors} onChange={e => setNewClientForm(f => ({ ...f, competitors: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Leave empty to use industry defaults</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddClientOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateClient} disabled={!newClientForm.name.trim()}>Create Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editClientOpen} onOpenChange={setEditClientOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Client Name</Label>
                  <Input value={selectedClient.name} onChange={e => updateClient(selectedClient.id, { name: e.target.value })} />
                </div>
                <div>
                  <Label>Brand Name</Label>
                  <Input value={selectedClient.brand_name} onChange={e => updateClient(selectedClient.id, { brand_name: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Industry</Label>
                  <Select value={selectedClient.industry} onValueChange={v => updateClient(selectedClient.id, { industry: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(industries).map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Target Region</Label>
                  <Select value={selectedClient.target_region} onValueChange={v => updateClient(selectedClient.id, { target_region: v, location_code: locations[v] || 2840 })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(locations).map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Primary Color</Label>
                <div className="flex gap-2 mt-1">
                  {["#ec4899", "#f59e0b", "#06b6d4", "#8b5cf6", "#10b981", "#ef4444", "#3b82f6", "#f97316"].map(color => (
                    <button key={color} className={cn("h-8 w-8 rounded-full border-2", selectedClient.primary_color === color ? "border-foreground" : "border-transparent")}
                      style={{ backgroundColor: color }} onClick={() => updateClient(selectedClient.id, { primary_color: color })} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditClientOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Prompts</DialogTitle>
            <DialogDescription>Paste prompts (one per line), JSON, or CSV data</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Paste your prompts here..." value={importText} onChange={e => setImportText(e.target.value)} rows={10} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleTextImport} disabled={!importText.trim()}>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Tabs */}
      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="summary" className="gap-2"><BarChart3 className="h-4 w-4" />Summary</TabsTrigger>
          <TabsTrigger value="prompts" className="gap-2"><FileText className="h-4 w-4" />Prompts ({prompts.length})</TabsTrigger>
          <TabsTrigger value="citations" className="gap-2"><Link2 className="h-4 w-4" />Citations ({allCitations.length})</TabsTrigger>
          <TabsTrigger value="content" className="gap-2"><BookOpen className="h-4 w-4" />Content</TabsTrigger>
          <TabsTrigger value="sources" className="gap-2"><Globe className="h-4 w-4" />Sources</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          {summary ? (
            <>
              {/* Metrics */}
              <div className="grid grid-cols-5 gap-4">
                <MetricCard label="Share of Voice" value={`${summary.overall_sov}%`} icon={<TrendingUp className="h-5 w-5" />}
                  color={summary.overall_sov >= 50 ? "text-green-400" : summary.overall_sov >= 25 ? "text-yellow-400" : "text-red-400"} />
                <MetricCard label="Average Rank" value={summary.average_rank ? `#${summary.average_rank}` : "N/A"} icon={<Award className="h-5 w-5" />}
                  color={summary.average_rank && summary.average_rank <= 3 ? "text-green-400" : "text-yellow-400"} />
                <MetricCard label="Citations" value={summary.total_citations.toString()} icon={<Globe className="h-5 w-5" />} color="text-blue-400" />
                <MetricCard label="Prompts" value={summary.total_prompts.toString()} icon={<FileText className="h-5 w-5" />} color="text-purple-400" />
                <MetricCard label="Total Cost" value={`$${summary.total_cost.toFixed(4)}`} icon={<DollarSign className="h-5 w-5" />} color="text-orange-400" />
              </div>

              {/* Model Visibility */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4">Visibility by Model</h3>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(summary.visibility_by_model).map(([modelId, data]) => {
                    const model = AI_MODELS.find(m => m.id === modelId);
                    const pct = data.total > 0 ? Math.round((data.visible / data.total) * 100) : 0;
                    return (
                      <div key={modelId} className="p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: model?.color }} />
                            <span className="text-sm font-medium">{model?.name || modelId}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">${data.cost.toFixed(4)}</span>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: model?.color }}>{data.visible}/{data.total}</div>
                        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: model?.color }} />
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{pct}% visible</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Competitor Gap & Sources */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Users className="h-4 w-4" /> Competitor Gap</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-28 text-sm font-medium truncate">{selectedClient?.brand_name}</div>
                      <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                        <div className="h-full rounded-full flex items-center justify-end pr-2 text-xs font-medium text-white"
                          style={{ width: `${Math.max(summary.overall_sov, 5)}%`, backgroundColor: selectedClient?.primary_color }}>
                          {summary.overall_sov}%
                        </div>
                      </div>
                    </div>
                    {summary.top_competitors.slice(0, 4).map(comp => {
                      const sov = Math.min(100, Math.round((comp.total_mentions / Math.max(1, summary.total_prompts * selectedModels.length)) * 50));
                      return (
                        <div key={comp.name} className="flex items-center gap-3">
                          <div className="w-28 text-sm truncate text-muted-foreground">{comp.name}</div>
                          <div className="flex-1 bg-muted rounded-full h-6 overflow-hidden">
                            <div className="h-full bg-gray-500 rounded-full flex items-center justify-end pr-2 text-xs font-medium text-white" style={{ width: `${Math.max(sov, 5)}%` }}>
                              {comp.total_mentions}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Globe className="h-4 w-4" /> Top Sources</h3>
                  <div className="space-y-2">
                    {summary.top_sources.slice(0, 5).map((source, idx) => (
                      <div key={source.domain} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4">{idx + 1}.</span>
                          <a href={`https://${source.domain}`} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-primary truncate max-w-[180px]">{source.domain}</a>
                        </div>
                        <Badge variant="secondary">{source.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Insights */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Insights</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/20 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Status</h4>
                    {summary.overall_sov >= 50 ? (
                      <div className="flex items-start gap-2 text-green-400"><CheckCircle className="h-5 w-5 mt-0.5" /><p className="text-sm">Strong visibility at {summary.overall_sov}%</p></div>
                    ) : summary.overall_sov >= 25 ? (
                      <div className="flex items-start gap-2 text-yellow-400"><AlertTriangle className="h-5 w-5 mt-0.5" /><p className="text-sm">Moderate visibility at {summary.overall_sov}%</p></div>
                    ) : (
                      <div className="flex items-start gap-2 text-red-400"><XCircle className="h-5 w-5 mt-0.5" /><p className="text-sm">Low visibility at {summary.overall_sov}%</p></div>
                    )}
                  </div>
                  <div className="p-4 bg-muted/20 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {summary.overall_sov < 50 && <li>• Increase brand mentions in authoritative sources</li>}
                      {summary.average_rank && summary.average_rank > 3 && <li>• Improve ranking in AI-generated lists</li>}
                      {summary.top_competitors[0] && <li>• Monitor {summary.top_competitors[0].name}'s presence</li>}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Run an audit to see your visibility summary</p>
            </div>
          )}
        </TabsContent>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="space-y-6">
          {/* Add Prompts */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Input placeholder="Add a prompt..." value={newPrompt} onChange={e => setNewPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddPrompt()} className="flex-1" />
              <Button onClick={handleAddPrompt} disabled={!newPrompt.trim()}><Plus className="h-4 w-4 mr-1" />Add</Button>
            </div>
            
            {/* AI Prompt Generation */}
            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium">AI Prompt Generator</span>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Enter keywords, tags, or topics (e.g., dating apps, safety features, India)" 
                  value={keywordsInput} 
                  onChange={e => setKeywordsInput(e.target.value)} 
                  onKeyDown={e => e.key === "Enter" && handleGeneratePrompts()}
                  className="flex-1"
                />
                <Button onClick={handleGeneratePrompts} disabled={!keywordsInput.trim() || generatingPrompts} className="bg-purple-600 hover:bg-purple-700">
                  {generatingPrompts ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Enter keywords and AI will generate relevant search prompts for visibility analysis</p>
            </div>
            
            {/* Bulk Add */}
            <details className="group">
              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">+ Add multiple prompts at once</summary>
              <div className="mt-3 space-y-2">
                <Textarea placeholder="Enter prompts (one per line)..." value={bulkPrompts} onChange={e => setBulkPrompts(e.target.value)} rows={4} />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">{bulkPrompts.split("\n").filter(l => l.trim()).length} prompts</span>
                  <Button size="sm" onClick={handleBulkAdd} disabled={!bulkPrompts.trim()}>Add All</Button>
                </div>
              </div>
            </details>
          </div>

          {/* Prompts Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Prompt</th>
                    {selectedModels.map(modelId => {
                      const model = AI_MODELS.find(m => m.id === modelId);
                      return (
                        <th key={modelId} className="text-center p-3 text-sm font-medium text-muted-foreground w-20">
                          <div className="flex flex-col items-center gap-1">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: model?.color }} />
                            <span className="text-xs">{model?.name.split(" ")[0]}</span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground w-16">Cost</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prompts.map((prompt) => {
                    const result = auditResults.find(r => r.prompt_id === prompt.id);
                    const isLoading = loadingPromptId === prompt.id;
                    
                    return (
                      <tr key={prompt.id} className={cn("border-t border-border hover:bg-muted/20", isLoading && "bg-primary/5")}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />}
                            <span className="text-sm">{prompt.prompt_text}</span>
                            {prompt.is_custom && <Badge variant="outline" className="text-xs flex-shrink-0">Custom</Badge>}
                          </div>
                        </td>
                        {selectedModels.map(modelId => {
                          const mr = result?.model_results.find(m => m.model === modelId);
                          return (
                            <td key={modelId} className="p-3 text-center">
                              {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" /> : result ? (
                                mr ? (!mr.success ? <span className="text-yellow-500" title={mr.error}>⚠️</span> : mr.brand_mentioned ? (
                                  <div className="flex flex-col items-center"><CheckCircle className="h-5 w-5 text-green-500" />{mr.brand_mention_count > 1 && <span className="text-xs text-green-500">×{mr.brand_mention_count}</span>}</div>
                                ) : <XCircle className="h-5 w-5 text-red-500 mx-auto" />) : <span className="text-muted-foreground">-</span>
                              ) : <span className="text-muted-foreground">-</span>}
                            </td>
                          );
                        })}
                        <td className="p-3 text-center text-xs text-muted-foreground">
                          {result ? `$${result.summary.total_cost.toFixed(4)}` : "-"}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {result ? (
                              <>
                                <Dialog>
                                  <DialogTrigger asChild><Button variant="ghost" size="sm">View</Button></DialogTrigger>
                                  <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
                                    <DialogHeader><DialogTitle>Prompt Analysis</DialogTitle></DialogHeader>
                                    <PromptDetailModal result={result} brandName={selectedClient?.brand_name || ""} />
                                  </DialogContent>
                                </Dialog>
                                <Button variant="ghost" size="sm" onClick={() => rerunAudit(prompt.id)} disabled={loading}><RefreshCw className="h-4 w-4" /></Button>
                              </>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => runAudit(prompt.prompt_text, prompt.id)} disabled={loading}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run"}
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => deletePrompt(prompt.id)} disabled={isLoading}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {prompts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No prompts yet. Add some above or import from a file.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Citations Tab */}
        <TabsContent value="citations" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              All Citations Summary
            </h3>
            <Badge variant="outline">{allCitations.length} unique citations</Badge>
          </div>

          {allCitations.length > 0 ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Citation</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground w-20">Count</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground w-48">Models</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Prompts</th>
                  </tr>
                </thead>
                <tbody>
                  {allCitations.slice(0, 50).map((citation, idx) => (
                    <tr key={idx} className="border-t border-border hover:bg-muted/20">
                      <td className="p-3">
                        <div className="space-y-1">
                          <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 font-medium">
                            {citation.title || citation.domain}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                          <p className="text-xs text-muted-foreground truncate max-w-md">{citation.url}</p>
                          {citation.snippet && <p className="text-xs text-muted-foreground line-clamp-2">{citation.snippet}</p>}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="secondary" className="text-lg">{citation.count}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {citation.models.map((model, midx) => {
                            const modelInfo = AI_MODELS.find(m => m.name === model);
                            return (
                              <Badge key={midx} variant="outline" className="text-xs" style={{ borderColor: modelInfo?.color, color: modelInfo?.color }}>
                                {model.split(" ")[0]}
                              </Badge>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {citation.prompts.slice(0, 2).map((p, pidx) => (
                            <Badge key={pidx} variant="outline" className="text-xs truncate max-w-[120px]" title={p}>
                              {p.substring(0, 25)}...
                            </Badge>
                          ))}
                          {citation.prompts.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{citation.prompts.length - 2}</Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allCitations.length > 50 && (
                <div className="p-3 text-center text-sm text-muted-foreground border-t">
                  Showing 50 of {allCitations.length} citations
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Run an audit to see all citations</p>
            </div>
          )}

          {/* Citation Stats */}
          {allCitations.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-xl p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Top Domains</h4>
                <div className="space-y-2">
                  {Array.from(new Map(allCitations.map(c => [c.domain, c])).values())
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
                    .map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="truncate">{c.domain}</span>
                        <Badge variant="secondary">{c.count}</Badge>
                      </div>
                    ))}
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Most Cited</h4>
                <div className="space-y-2">
                  {allCitations.slice(0, 5).map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[180px]">{c.title || c.domain}</span>
                      <Badge variant="secondary">{c.count}×</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Citation Coverage</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Total Citations</span>
                      <span className="font-medium">{allCitations.reduce((sum, c) => sum + c.count, 0)}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Unique URLs</span>
                      <span className="font-medium">{allCitations.length}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Unique Domains</span>
                      <span className="font-medium">{new Set(allCitations.map(c => c.domain)).size}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">GEO Content Generator</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Generate AI-optimized content that positions {selectedClient?.brand_name} for better visibility in AI responses.
            </p>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="col-span-2">
                <Label className="mb-2 block">Topic / Title</Label>
                <Input 
                  placeholder={`e.g., Best ${selectedClient?.industry} solutions in ${selectedClient?.target_region}`}
                  value={contentTopic}
                  onChange={e => setContentTopic(e.target.value)}
                />
              </div>
              <div>
                <Label className="mb-2 block">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="listicle">Listicle</SelectItem>
                    <SelectItem value="comparison">Comparison</SelectItem>
                    <SelectItem value="guide">How-to Guide</SelectItem>
                    <SelectItem value="faq">FAQ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleGenerateContent} 
              disabled={!contentTopic.trim() || generatingContent}
              className="w-full"
            >
              {generatingContent ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Generating Content...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Generate GEO-Optimized Content</>
              )}
            </Button>
          </div>

          {generatedContent && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                <h4 className="font-medium">Generated Content</h4>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyContent}>
                    <Copy className="h-4 w-4 mr-1" />Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadContent}>
                    <Download className="h-4 w-4 mr-1" />Download
                  </Button>
                </div>
              </div>
              <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm">{generatedContent}</pre>
              </div>
            </div>
          )}

          {!generatedContent && !generatingContent && (
            <div className="text-center py-12 text-muted-foreground bg-card border border-border rounded-xl">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Enter a topic and generate AI-optimized content</p>
              <p className="text-xs mt-2">Content will naturally feature {selectedClient?.brand_name} and be structured for AI citation</p>
            </div>
          )}
        </TabsContent>

        {/* Sources Tab */}
        <TabsContent value="sources" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant={viewMode === "domains" ? "default" : "outline"} size="sm" onClick={() => setViewMode("domains")}>Domains</Button>
              <Button variant={viewMode === "urls" ? "default" : "outline"} size="sm" onClick={() => setViewMode("urls")}>URLs</Button>
            </div>
            <Badge variant="outline">{sourceSummary.length} sources</Badge>
          </div>

          {sourceSummary.length > 0 ? (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">{viewMode === "domains" ? "Domain" : "URL"}</th>
                    <th className="text-center p-3 text-sm font-medium text-muted-foreground w-24">Citations</th>
                    <th className="text-left p-3 text-sm font-medium text-muted-foreground">Prompts</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceSummary.slice(0, 25).map((source) => (
                    viewMode === "domains" ? (
                      <tr key={source.domain} className="border-t border-border hover:bg-muted/20">
                        <td className="p-3">
                          <a href={`https://${source.domain}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                            {source.domain}<ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                        <td className="p-3 text-center"><Badge variant="secondary">{source.total_count}</Badge></td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {source.prompts.slice(0, 2).map((p, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs truncate max-w-[150px]">{p.substring(0, 20)}...</Badge>
                            ))}
                            {source.prompts.length > 2 && <Badge variant="outline" className="text-xs">+{source.prompts.length - 2}</Badge>}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      source.full_urls.slice(0, 2).map((url, idx) => (
                        <tr key={`${source.domain}-${idx}`} className="border-t border-border hover:bg-muted/20">
                          <td className="p-3">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm truncate max-w-md">
                              {url.length > 60 ? url.substring(0, 60) + "..." : url}<ExternalLink className="h-3 w-3 flex-shrink-0" />
                            </a>
                          </td>
                          <td className="p-3 text-center"><Badge variant="secondary">1</Badge></td>
                          <td className="p-3"><Badge variant="outline" className="text-xs">{source.domain}</Badge></td>
                        </tr>
                      ))
                    )
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Run an audit to see citation sources</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">{icon}<span className="text-sm font-medium">{label}</span></div>
      <div className={cn("text-2xl font-bold", color)}>{value}</div>
    </div>
  );
}

function PromptDetailModal({ result, brandName }: { result: AuditResult; brandName: string }) {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-muted/30 rounded-lg">
        <p className="font-medium text-lg">{result.prompt_text}</p>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>SOV: <strong className={result.summary.share_of_voice >= 50 ? "text-green-500" : result.summary.share_of_voice >= 25 ? "text-yellow-500" : "text-red-500"}>{result.summary.share_of_voice}%</strong></span>
          {result.summary.average_rank && <span>Rank: <strong>#{result.summary.average_rank}</strong></span>}
          <span>Citations: <strong>{result.summary.total_citations}</strong></span>
          <span>Cost: <strong>${result.summary.total_cost.toFixed(4)}</strong></span>
        </div>
      </div>

      {/* Model Results */}
      <div className="space-y-4">
        {result.model_results.map((mr) => {
          const model = AI_MODELS.find(m => m.id === mr.model);
          const isExpanded = expandedModel === mr.model;
          
          return (
            <div key={mr.model} className="border border-border rounded-lg overflow-hidden">
              <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/20" style={{ backgroundColor: (model?.color || "#666") + "10" }}
                onClick={() => setExpandedModel(isExpanded ? null : mr.model)}>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: model?.color || "#666" }} />
                  <span className="font-medium">{mr.model_name}</span>
                  {!mr.success ? <Badge variant="outline" className="text-yellow-500">Error</Badge> : mr.brand_mentioned ? (
                    <Badge className="bg-green-500/20 text-green-500 text-xs">Visible {mr.brand_mention_count > 1 && `(×${mr.brand_mention_count})`}</Badge>
                  ) : <Badge variant="destructive" className="text-xs">Not Visible</Badge>}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {mr.brand_rank && <Badge variant="outline">#{mr.brand_rank}</Badge>}
                  <Badge variant="outline">{mr.citation_count} citations</Badge>
                  <Badge variant="outline">${(mr.api_cost || 0).toFixed(4)}</Badge>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                </div>
              </div>
              
              <div className="p-3 border-t border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Response</span>
                  {mr.winner_brand && <Badge variant={mr.winner_brand === brandName ? "default" : "secondary"} className="text-xs">Winner: {mr.winner_brand}</Badge>}
                </div>
                <pre className={cn("text-xs text-muted-foreground whitespace-pre-wrap bg-muted/20 p-3 rounded overflow-y-auto font-mono", isExpanded ? "max-h-96" : "max-h-32")}>
                  {mr.raw_response || (mr.error ? `Error: ${mr.error}` : "No response")}
                </pre>
              </div>

              {isExpanded && mr.success && (
                <>
                  {mr.competitors_found?.length > 0 && (
                    <div className="p-3 border-t border-border/50">
                      <p className="text-xs font-medium mb-2">Competitors:</p>
                      <div className="flex flex-wrap gap-1">
                        {mr.competitors_found.map((comp, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{comp.name} {comp.rank && `#${comp.rank}`} ({comp.count}×)</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="p-3 border-t border-border/50">
                    <p className="text-xs font-medium mb-2">Citations ({mr.citations.length}):</p>
                    {mr.citations.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {mr.citations.slice(0, 10).map((c, idx) => (
                          <div key={idx} className="p-2 bg-muted/20 rounded text-xs">
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{c.title || c.url}</a>
                            <span className="text-muted-foreground ml-2">{c.domain}</span>
                            {c.snippet && <p className="text-muted-foreground mt-1 line-clamp-2">{c.snippet}</p>}
                          </div>
                        ))}
                      </div>
                    ) : <p className="text-xs text-muted-foreground italic">No citations</p>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {result.top_sources?.length > 0 && (
        <div className="p-4 bg-muted/20 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Top Sources</h4>
          <div className="flex flex-wrap gap-2">
            {result.top_sources.slice(0, 8).map((s, idx) => <Badge key={idx} variant="outline" className="text-xs">{s.domain} ({s.count})</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
}
