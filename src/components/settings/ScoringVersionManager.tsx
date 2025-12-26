import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Calculator,
  Plus,
  Check,
  History,
  Settings,
  Save,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ScoringVersion {
  id: string;
  version: string;
  algorithm_config: {
    mentionWeight: number;
    rankDecay: number;
    sentimentMultiplier: {
      positive: number;
      neutral: number;
      negative: number;
    };
    citationBonus: number;
    competitorPenalty: number;
  };
  weights: {
    visibility: number;
    citations: number;
    sentiment: number;
    rank: number;
  };
  is_active: boolean;
  description: string;
  created_at: string;
}

export function ScoringVersionManager() {
  const [versions, setVersions] = useState<ScoringVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newVersion, setNewVersion] = useState({
    version: "",
    description: "",
    weights: { visibility: 0.4, citations: 0.3, sentiment: 0.2, rank: 0.1 },
    algorithm_config: {
      mentionWeight: 1.0,
      rankDecay: 0.1,
      sentimentMultiplier: { positive: 1.2, neutral: 1.0, negative: 0.8 },
      citationBonus: 0.15,
      competitorPenalty: 0.05,
    },
  });
  const { toast } = useToast();

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("scoring_versions")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setVersions((data as ScoringVersion[]) || []);
    } catch (err) {
      console.error("Failed to fetch scoring versions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  const activateVersion = async (versionId: string) => {
    try {
      // Deactivate all versions
      await supabase
        .from("scoring_versions")
        .update({ is_active: false })
        .neq("id", "");
      
      // Activate selected version
      const { error } = await supabase
        .from("scoring_versions")
        .update({ is_active: true })
        .eq("id", versionId);
      
      if (error) throw error;
      
      setVersions(prev => prev.map(v => ({
        ...v,
        is_active: v.id === versionId,
      })));
      
      toast({ title: "Version Activated", description: "Scoring algorithm updated" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to activate version", variant: "destructive" });
    }
  };

  const createVersion = async () => {
    if (!newVersion.version) return;
    
    try {
      const { error } = await supabase
        .from("scoring_versions")
        .insert({
          version: newVersion.version,
          description: newVersion.description,
          weights: newVersion.weights,
          algorithm_config: newVersion.algorithm_config,
          is_active: false,
        });
      
      if (error) throw error;
      
      toast({ title: "Version Created", description: `${newVersion.version} has been created` });
      setShowCreate(false);
      setNewVersion({
        version: "",
        description: "",
        weights: { visibility: 0.4, citations: 0.3, sentiment: 0.2, rank: 0.1 },
        algorithm_config: {
          mentionWeight: 1.0,
          rankDecay: 0.1,
          sentimentMultiplier: { positive: 1.2, neutral: 1.0, negative: 0.8 },
          citationBonus: 0.15,
          competitorPenalty: 0.05,
        },
      });
      fetchVersions();
    } catch (err) {
      toast({ title: "Error", description: "Failed to create version", variant: "destructive" });
    }
  };

  const activeVersion = versions.find(v => v.is_active);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Scoring Algorithms
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchVersions}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Version
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Scoring Version</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Version</Label>
                    <Input
                      value={newVersion.version}
                      onChange={(e) => setNewVersion(v => ({ ...v, version: e.target.value }))}
                      placeholder="v1.1.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={newVersion.description}
                      onChange={(e) => setNewVersion(v => ({ ...v, description: e.target.value }))}
                      placeholder="Improved citation weighting"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Score Weights (must sum to 1.0)</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Visibility: {newVersion.weights.visibility}</Label>
                      <Slider
                        value={[newVersion.weights.visibility * 100]}
                        onValueChange={([v]) => setNewVersion(nv => ({
                          ...nv,
                          weights: { ...nv.weights, visibility: v / 100 }
                        }))}
                        max={100}
                        step={5}
                        className="w-48"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Citations: {newVersion.weights.citations}</Label>
                      <Slider
                        value={[newVersion.weights.citations * 100]}
                        onValueChange={([v]) => setNewVersion(nv => ({
                          ...nv,
                          weights: { ...nv.weights, citations: v / 100 }
                        }))}
                        max={100}
                        step={5}
                        className="w-48"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Sentiment: {newVersion.weights.sentiment}</Label>
                      <Slider
                        value={[newVersion.weights.sentiment * 100]}
                        onValueChange={([v]) => setNewVersion(nv => ({
                          ...nv,
                          weights: { ...nv.weights, sentiment: v / 100 }
                        }))}
                        max={100}
                        step={5}
                        className="w-48"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Rank: {newVersion.weights.rank}</Label>
                      <Slider
                        value={[newVersion.weights.rank * 100]}
                        onValueChange={([v]) => setNewVersion(nv => ({
                          ...nv,
                          weights: { ...nv.weights, rank: v / 100 }
                        }))}
                        max={100}
                        step={5}
                        className="w-48"
                      />
                    </div>
                  </div>
                </div>
                
                <Button onClick={createVersion} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  Create Version
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Active Version */}
        {activeVersion && (
          <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-primary" />
                <span className="font-medium">Active: {activeVersion.version}</span>
              </div>
              <Badge variant="default">Current</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{activeVersion.description}</p>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="rounded bg-background p-2 text-center">
                <p className="font-medium">{(activeVersion.weights.visibility * 100).toFixed(0)}%</p>
                <p className="text-muted-foreground">Visibility</p>
              </div>
              <div className="rounded bg-background p-2 text-center">
                <p className="font-medium">{(activeVersion.weights.citations * 100).toFixed(0)}%</p>
                <p className="text-muted-foreground">Citations</p>
              </div>
              <div className="rounded bg-background p-2 text-center">
                <p className="font-medium">{(activeVersion.weights.sentiment * 100).toFixed(0)}%</p>
                <p className="text-muted-foreground">Sentiment</p>
              </div>
              <div className="rounded bg-background p-2 text-center">
                <p className="font-medium">{(activeVersion.weights.rank * 100).toFixed(0)}%</p>
                <p className="text-muted-foreground">Rank</p>
              </div>
            </div>
          </div>
        )}

        {/* Version History */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Version History
          </h4>
          <ScrollArea className="h-[250px]">
            <div className="space-y-2">
              {versions.filter(v => !v.is_active).map((version) => (
                <div
                  key={version.id}
                  className="rounded-lg border border-border p-3 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{version.version}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(version.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => activateVersion(version.id)}>
                      Activate
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{version.description}</p>
                  <div className="flex gap-2 mt-2 text-xs">
                    <Badge variant="secondary">V:{(version.weights.visibility * 100).toFixed(0)}%</Badge>
                    <Badge variant="secondary">C:{(version.weights.citations * 100).toFixed(0)}%</Badge>
                    <Badge variant="secondary">S:{(version.weights.sentiment * 100).toFixed(0)}%</Badge>
                    <Badge variant="secondary">R:{(version.weights.rank * 100).toFixed(0)}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
