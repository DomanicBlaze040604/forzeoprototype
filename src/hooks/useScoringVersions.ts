import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

interface ScoringVersion {
  id: string;
  version: string;
  algorithm_config: Record<string, any>;
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

interface CreateVersionParams {
  version: string;
  description?: string;
  weights: ScoringVersion["weights"];
  algorithm_config: Record<string, any>;
}

export function useScoringVersions() {
  const [versions, setVersions] = useState<ScoringVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<ScoringVersion | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("scoring_versions")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const versionData = (data as ScoringVersion[]) || [];
      setVersions(versionData);
      setActiveVersion(versionData.find(v => v.is_active) || null);
    } catch (err) {
      console.error("Failed to fetch scoring versions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createVersion = useCallback(async (params: CreateVersionParams): Promise<ScoringVersion | null> => {
    try {
      const { data, error } = await supabase
        .from("scoring_versions")
        .insert({
          version: params.version,
          description: params.description || "",
          weights: params.weights,
          algorithm_config: params.algorithm_config,
          is_active: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast({ title: "Version Created", description: `${params.version} has been created` });
      await fetchVersions();
      return data as ScoringVersion;
    } catch (err) {
      toast({ title: "Error", description: "Failed to create version", variant: "destructive" });
      return null;
    }
  }, [toast, fetchVersions]);

  const activateVersion = useCallback(async (versionId: string): Promise<boolean> => {
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
      
      await fetchVersions();
      toast({ title: "Version Activated", description: "Scoring algorithm updated" });
      return true;
    } catch (err) {
      toast({ title: "Error", description: "Failed to activate version", variant: "destructive" });
      return false;
    }
  }, [toast, fetchVersions]);

  const deleteVersion = useCallback(async (versionId: string): Promise<boolean> => {
    try {
      const version = versions.find(v => v.id === versionId);
      if (version?.is_active) {
        toast({ title: "Error", description: "Cannot delete active version", variant: "destructive" });
        return false;
      }
      
      const { error } = await supabase
        .from("scoring_versions")
        .delete()
        .eq("id", versionId);
      
      if (error) throw error;
      
      setVersions(prev => prev.filter(v => v.id !== versionId));
      toast({ title: "Version Deleted", description: "Scoring version removed" });
      return true;
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete version", variant: "destructive" });
      return false;
    }
  }, [versions, toast]);

  // Calculate score using active version weights
  const calculateScore = useCallback((metrics: {
    visibility: number;
    citations: number;
    sentiment: number;
    rank: number;
  }): number => {
    if (!activeVersion) return 0;
    
    const { weights } = activeVersion;
    return Math.round(
      metrics.visibility * weights.visibility +
      metrics.citations * weights.citations +
      metrics.sentiment * weights.sentiment +
      metrics.rank * weights.rank
    );
  }, [activeVersion]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  return {
    versions,
    activeVersion,
    loading,
    fetchVersions,
    createVersion,
    activateVersion,
    deleteVersion,
    calculateScore,
  };
}
