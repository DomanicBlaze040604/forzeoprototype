import { useState } from "react";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";
import { 
  FileText, 
  Sparkles, 
  RotateCcw,
  Plus,
  History,
  ChevronDown,
  Loader2,
  Copy,
  Check,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useContentGeneration } from "@/hooks/useContentGeneration";

const topics = [
  "Wireless Earbuds",
  "Bluetooth Speakers", 
  "Smartwatch",
  "Power Banks",
  "Accessories",
  "AI Tools",
  "Software Development",
  "Cloud Computing",
];

const contentTypes = [
  { value: "blog", label: "Blog Post", description: "Informative article with SEO optimization" },
  { value: "comparison", label: "Product Comparison", description: "Side-by-side product analysis" },
  { value: "listicle", label: "Listicle", description: "Numbered list format article" },
  { value: "guide", label: "Buyer's Guide", description: "Comprehensive purchasing guide" },
  { value: "review", label: "Product Review", description: "In-depth single product review" },
];

const models = [
  { value: "groq", label: "Groq (Llama 3.1)", description: "Fast generation - Free" },
  { value: "gpt4", label: "GPT-4", description: "Best quality - Premium" },
  { value: "claude", label: "Claude 3.5", description: "Natural writing - Premium" },
];

export default function ContentGen() {
  const { isOpen } = useSidebar();
  const { toast } = useToast();
  const { history, generating, error, generateContent, deleteFromHistory, clearHistory } = useContentGeneration();
  
  const [activeTab, setActiveTab] = useState("select");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [contentType, setContentType] = useState("");
  const [selectedModel, setSelectedModel] = useState("groq");
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [brandVoice, setBrandVoice] = useState("professional");
  const [generatedContent, setGeneratedContent] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAddUrl = () => {
    if (newUrl && !referenceUrls.includes(newUrl)) {
      try {
        new URL(newUrl); // Validate URL
        setReferenceUrls([...referenceUrls, newUrl]);
        setNewUrl("");
      } catch {
        toast({
          title: "Invalid URL",
          description: "Please enter a valid URL",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveUrl = (url: string) => {
    setReferenceUrls(referenceUrls.filter(u => u !== url));
  };

  const handleGenerate = async () => {
    const topic = activeTab === "select" ? selectedTopic : customTopic;
    if (!topic || !contentType) {
      toast({
        title: "Missing fields",
        description: "Please select a topic and content type.",
        variant: "destructive"
      });
      return;
    }

    const content = await generateContent({
      topic,
      contentType,
      model: selectedModel,
      brandVoice,
      referenceUrls: referenceUrls.length > 0 ? referenceUrls : undefined,
    });

    if (content) {
      setGeneratedContent(content);
      toast({
        title: "Content generated!",
        description: "Your content is ready for review.",
      });
    } else if (error) {
      toast({
        title: "Generation failed",
        description: error,
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setSelectedTopic("");
    setCustomTopic("");
    setContentType("");
    setSelectedModel("groq");
    setReferenceUrls([]);
    setGeneratedContent("");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  const handleLoadFromHistory = (content: string) => {
    setGeneratedContent(content);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn("transition-all duration-200 ease-in-out", isOpen ? "ml-56" : "ml-0")}>
        <Header title="Content Generation" />
        <main className="p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-foreground mb-2">Generate Content</h1>
            <p className="text-muted-foreground">
              Create optimized content strategies based on your tracked topics.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Form */}
            <div className="bg-card border border-border rounded-xl p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="select">Select Topic</TabsTrigger>
                  <TabsTrigger value="custom">Custom Topic</TabsTrigger>
                </TabsList>

                <TabsContent value="select" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Topic</label>
                    <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a topic..." />
                      </SelectTrigger>
                      <SelectContent>
                        {topics.map(topic => (
                          <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">From your brand's tracked topics</p>
                  </div>
                </TabsContent>

                <TabsContent value="custom" className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Custom Topic</label>
                    <Input
                      placeholder="Enter your topic..."
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="space-y-4 mt-6">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Content Type</label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select content type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex flex-col">
                            <span>{type.label}</span>
                            <span className="text-xs text-muted-foreground">{type.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Model</label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map(model => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="flex flex-col">
                            <span>{model.label}</span>
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Brand Voice</label>
                  <Select value={brandVoice} onValueChange={setBrandVoice}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Reference URLs <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="https://example.com/article"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                    />
                    <Button variant="outline" size="icon" onClick={handleAddUrl}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {referenceUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {referenceUrls.map(url => (
                        <Badge key={url} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveUrl(url)}>
                          {new URL(url).hostname} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleGenerate} disabled={generating} className="flex-1">
                    {generating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" />Generate Content</>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-2" />Reset
                  </Button>
                </div>
              </div>

              {/* History Toggle */}
              <div className="mt-6 pt-4 border-t border-border">
                <Button variant="ghost" className="w-full justify-between" onClick={() => setShowHistory(!showHistory)}>
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Content History ({history.length})
                  </span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showHistory && "rotate-180")} />
                </Button>
                {showHistory && (
                  <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                    {history.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No content generated yet</p>
                    ) : (
                      <>
                        {history.map(item => (
                          <div key={item.id} className="p-3 bg-muted/30 rounded-lg group">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{item.topic}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                  onClick={() => deleteFromHistory(item.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{item.content.substring(0, 100)}...</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{item.contentType}</Badge>
                              <Badge variant="outline" className="text-xs">{item.model}</Badge>
                              <Button
                                variant="link"
                                size="sm"
                                className="text-xs h-auto p-0 ml-auto"
                                onClick={() => handleLoadFromHistory(item.content)}
                              >
                                Load
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={clearHistory}>
                          Clear All History
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Generated Content */}
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generated Content
                </h2>
                {generatedContent && (
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? <><Check className="h-4 w-4 mr-2" />Copied!</> : <><Copy className="h-4 w-4 mr-2" />Copy</>}
                  </Button>
                )}
              </div>
              {generatedContent ? (
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  className="min-h-[500px] font-mono text-sm resize-none"
                  placeholder="Generated content will appear here..."
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                  <p>Generated content will appear here</p>
                  <p className="text-sm">Select a topic and click Generate</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
