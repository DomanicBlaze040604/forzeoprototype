import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Target,
  Layers,
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  Search,
  Filter,
  TrendingUp,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Intent types for prompt classification
export type PromptIntent = "informational" | "navigational" | "transactional" | "commercial";

// Funnel stages
export type FunnelStage = "awareness" | "consideration" | "decision" | "retention";

interface Prompt {
  id: string;
  text: string;
  visibility_score: number | null;
  tag?: string;
  intent?: PromptIntent;
  funnel_stage?: FunnelStage;
  topic_cluster?: string;
}

interface PromptGroupingProps {
  prompts: Prompt[];
  onUpdatePrompt: (id: string, updates: Partial<Prompt>) => Promise<void>;
  onBulkUpdate?: (ids: string[], updates: Partial<Prompt>) => Promise<void>;
}

const INTENT_CONFIG: Record<PromptIntent, { label: string; color: string; description: string }> = {
  informational: {
    label: "Informational",
    color: "bg-blue-500",
    description: "User seeking information or answers",
  },
  navigational: {
    label: "Navigational",
    color: "bg-purple-500",
    description: "User looking for a specific website or page",
  },
  transactional: {
    label: "Transactional",
    color: "bg-green-500",
    description: "User ready to make a purchase or take action",
  },
  commercial: {
    label: "Commercial",
    color: "bg-orange-500",
    description: "User researching before a purchase decision",
  },
};

const FUNNEL_CONFIG: Record<FunnelStage, { label: string; color: string; description: string }> = {
  awareness: {
    label: "Awareness",
    color: "bg-cyan-500",
    description: "Top of funnel - discovering solutions",
  },
  consideration: {
    label: "Consideration",
    color: "bg-yellow-500",
    description: "Middle of funnel - evaluating options",
  },
  decision: {
    label: "Decision",
    color: "bg-emerald-500",
    description: "Bottom of funnel - ready to choose",
  },
  retention: {
    label: "Retention",
    color: "bg-pink-500",
    description: "Post-purchase - existing customers",
  },
};

export function PromptGrouping({
  prompts,
  onUpdatePrompt,
  onBulkUpdate,
}: PromptGroupingProps) {
  const [viewMode, setViewMode] = useState<"intent" | "funnel" | "topic">("intent");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [newTopicCluster, setNewTopicCluster] = useState("");

  // Get unique topic clusters
  const topicClusters = useMemo(() => {
    const clusters = new Set<string>();
    prompts.forEach((p) => {
      if (p.topic_cluster) clusters.add(p.topic_cluster);
    });
    return Array.from(clusters);
  }, [prompts]);

  // Filter prompts
  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) =>
      p.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [prompts, searchQuery]);

  // Group prompts by intent
  const promptsByIntent = useMemo(() => {
    const groups: Record<string, Prompt[]> = {
      informational: [],
      navigational: [],
      transactional: [],
      commercial: [],
      unclassified: [],
    };
    filteredPrompts.forEach((p) => {
      const key = p.intent || "unclassified";
      groups[key].push(p);
    });
    return groups;
  }, [filteredPrompts]);

  // Group prompts by funnel stage
  const promptsByFunnel = useMemo(() => {
    const groups: Record<string, Prompt[]> = {
      awareness: [],
      consideration: [],
      decision: [],
      retention: [],
      unclassified: [],
    };
    filteredPrompts.forEach((p) => {
      const key = p.funnel_stage || "unclassified";
      groups[key].push(p);
    });
    return groups;
  }, [filteredPrompts]);

  // Group prompts by topic
  const promptsByTopic = useMemo(() => {
    const groups: Record<string, Prompt[]> = { Uncategorized: [] };
    filteredPrompts.forEach((p) => {
      const key = p.topic_cluster || "Uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [filteredPrompts]);

  const handleBulkAssign = async (field: string, value: string) => {
    if (selectedPrompts.length === 0) return;
    if (onBulkUpdate) {
      await onBulkUpdate(selectedPrompts, { [field]: value });
    } else {
      for (const id of selectedPrompts) {
        await onUpdatePrompt(id, { [field]: value });
      }
    }
    setSelectedPrompts([]);
  };

  const togglePromptSelection = (id: string) => {
    setSelectedPrompts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const renderPromptCard = (prompt: Prompt, index: number) => (
    <motion.div
      key={prompt.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border p-3 transition-colors cursor-pointer",
        selectedPrompts.includes(prompt.id)
          ? "bg-primary/10 border-primary"
          : "hover:bg-secondary/30"
      )}
      onClick={() => togglePromptSelection(prompt.id)}
    >
      <input
        type="checkbox"
        checked={selectedPrompts.includes(prompt.id)}
        onChange={() => togglePromptSelection(prompt.id)}
        className="h-4 w-4 rounded border-border"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{prompt.text}</p>
        <div className="flex items-center gap-2 mt-1">
          {prompt.intent && (
            <Badge variant="outline" className="text-xs">
              {INTENT_CONFIG[prompt.intent].label}
            </Badge>
          )}
          {prompt.funnel_stage && (
            <Badge variant="secondary" className="text-xs">
              {FUNNEL_CONFIG[prompt.funnel_stage].label}
            </Badge>
          )}
          {prompt.topic_cluster && (
            <Badge variant="outline" className="text-xs">
              {prompt.topic_cluster}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">
            {prompt.visibility_score || 0}%
          </p>
          <p className="text-xs text-muted-foreground">visibility</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            setEditingPrompt(prompt);
          }}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );

  const renderGroupSection = (
    title: string,
    prompts: Prompt[],
    color?: string,
    description?: string
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {color && <div className={cn("h-3 w-3 rounded-full", color)} />}
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
          <Badge variant="secondary" className="text-xs">
            {prompts.length}
          </Badge>
        </div>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
      <div className="space-y-2 pl-5">
        {prompts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No prompts in this group</p>
        ) : (
          prompts.map((p, i) => renderPromptCard(p, i))
        )}
      </div>
    </div>
  );

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-primary" />
              Prompt Grouping
            </CardTitle>
            <CardDescription>
              Organize prompts by intent, funnel stage, or topic cluster
            </CardDescription>
          </div>
          {selectedPrompts.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedPrompts.length} selected</Badge>
              <Select onValueChange={(v) => handleBulkAssign("intent", v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Set Intent" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INTENT_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={(v) => handleBulkAssign("funnel_stage", v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Set Stage" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FUNNEL_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPrompts([])}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search prompts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="intent" className="gap-2">
              <Target className="h-4 w-4" />
              By Intent
            </TabsTrigger>
            <TabsTrigger value="funnel" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              By Funnel
            </TabsTrigger>
            <TabsTrigger value="topic" className="gap-2">
              <Layers className="h-4 w-4" />
              By Topic
            </TabsTrigger>
          </TabsList>

          <TabsContent value="intent">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {Object.entries(INTENT_CONFIG).map(([key, config]) =>
                  renderGroupSection(
                    config.label,
                    promptsByIntent[key] || [],
                    config.color,
                    config.description
                  )
                )}
                {renderGroupSection(
                  "Unclassified",
                  promptsByIntent.unclassified || [],
                  "bg-gray-500",
                  "Prompts without intent classification"
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="funnel">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {Object.entries(FUNNEL_CONFIG).map(([key, config]) =>
                  renderGroupSection(
                    config.label,
                    promptsByFunnel[key] || [],
                    config.color,
                    config.description
                  )
                )}
                {renderGroupSection(
                  "Unclassified",
                  promptsByFunnel.unclassified || [],
                  "bg-gray-500",
                  "Prompts without funnel stage"
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="topic">
            <div className="mb-4 flex items-center gap-2">
              <Input
                placeholder="New topic cluster..."
                value={newTopicCluster}
                onChange={(e) => setNewTopicCluster(e.target.value)}
                className="max-w-xs"
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!newTopicCluster.trim() || selectedPrompts.length === 0}
                onClick={() => {
                  handleBulkAssign("topic_cluster", newTopicCluster.trim());
                  setNewTopicCluster("");
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Assign to Topic
              </Button>
            </div>
            <ScrollArea className="h-[450px] pr-4">
              <div className="space-y-6">
                {Object.entries(promptsByTopic)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([topic, topicPrompts]) =>
                    renderGroupSection(topic, topicPrompts)
                  )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Edit Prompt Dialog */}
      <Dialog open={!!editingPrompt} onOpenChange={() => setEditingPrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Prompt Classification</DialogTitle>
            <DialogDescription>
              Update the intent, funnel stage, and topic for this prompt
            </DialogDescription>
          </DialogHeader>
          {editingPrompt && (
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary/30 p-3">
                <p className="text-sm text-foreground">{editingPrompt.text}</p>
              </div>

              <div className="space-y-2">
                <Label>Intent</Label>
                <Select
                  value={editingPrompt.intent || ""}
                  onValueChange={(v) =>
                    setEditingPrompt({ ...editingPrompt, intent: v as PromptIntent })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select intent" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INTENT_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", config.color)} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Funnel Stage</Label>
                <Select
                  value={editingPrompt.funnel_stage || ""}
                  onValueChange={(v) =>
                    setEditingPrompt({ ...editingPrompt, funnel_stage: v as FunnelStage })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select funnel stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(FUNNEL_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", config.color)} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Topic Cluster</Label>
                <Input
                  value={editingPrompt.topic_cluster || ""}
                  onChange={(e) =>
                    setEditingPrompt({ ...editingPrompt, topic_cluster: e.target.value })
                  }
                  placeholder="Enter topic cluster"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingPrompt(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await onUpdatePrompt(editingPrompt.id, {
                      intent: editingPrompt.intent,
                      funnel_stage: editingPrompt.funnel_stage,
                      topic_cluster: editingPrompt.topic_cluster,
                    });
                    setEditingPrompt(null);
                  }}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
