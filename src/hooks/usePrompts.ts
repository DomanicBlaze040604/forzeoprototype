import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Prompt {
  id: string;
  text: string;
  visibility_score: number | null;
  tag: string | null;
  location_country: string | null;
  brand_id: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface PromptResult {
  id: string;
  prompt_id: string;
  model: string;
  brand_mentioned: boolean;
  sentiment: string | null;
  rank: number | null;
  response_text: string | null;
  citations: any;
  analyzed_at: string;
}

export interface PromptWithResults extends Prompt {
  results: PromptResult[];
}

export function usePrompts(brandId?: string) {
  const [prompts, setPrompts] = useState<PromptWithResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPrompts = useCallback(async () => {
    if (!user) {
      setPrompts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from("prompts")
        .select("*")
        .order("created_at", { ascending: false });

      if (brandId) {
        query = query.eq("brand_id", brandId);
      }

      const { data: promptsData, error: promptsError } = await query;

      if (promptsError) throw promptsError;

      // Fetch results for all prompts
      if (promptsData && promptsData.length > 0) {
        const promptIds = promptsData.map((p) => p.id);
        const { data: resultsData, error: resultsError } = await supabase
          .from("prompt_results")
          .select("*")
          .in("prompt_id", promptIds);

        if (resultsError) throw resultsError;

        const promptsWithResults: PromptWithResults[] = promptsData.map((prompt) => ({
          ...prompt,
          results: resultsData?.filter((r) => r.prompt_id === prompt.id) || [],
        }));

        setPrompts(promptsWithResults);
      } else {
        setPrompts([]);
      }
    } catch (error) {
      console.error("Error fetching prompts:", error);
      toast({
        title: "Error",
        description: "Failed to load prompts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, brandId, toast]);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const addPrompt = async (
    text: string,
    options?: { tag?: string; location_country?: string; brand_id?: string }
  ): Promise<Prompt | null> => {
    if (!user) return null;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("prompts")
        .insert({
          text,
          user_id: user.id,
          tag: options?.tag || null,
          location_country: options?.location_country || "US",
          brand_id: options?.brand_id || brandId || null,
          visibility_score: 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newPrompt: PromptWithResults = { ...data, results: [] };
      setPrompts((prev) => [newPrompt, ...prev]);

      return data;
    } catch (error) {
      console.error("Error adding prompt:", error);
      toast({
        title: "Error",
        description: "Failed to add prompt",
        variant: "destructive",
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const bulkAddPrompts = async (
    promptsToAdd: Array<{ text: string; tag?: string; location_country?: string }>
  ): Promise<Prompt[]> => {
    if (!user) return [];

    setSaving(true);
    try {
      const promptRecords = promptsToAdd.map((p) => ({
        text: p.text,
        user_id: user.id,
        tag: p.tag || null,
        location_country: p.location_country || "US",
        brand_id: brandId || null,
        visibility_score: 0,
      }));

      const { data, error } = await supabase
        .from("prompts")
        .insert(promptRecords)
        .select();

      if (error) throw error;

      const newPrompts: PromptWithResults[] = (data || []).map((p) => ({
        ...p,
        results: [],
      }));
      setPrompts((prev) => [...newPrompts, ...prev]);

      toast({
        title: "Success",
        description: `Imported ${data?.length || 0} prompts`,
      });

      return data || [];
    } catch (error) {
      console.error("Error bulk adding prompts:", error);
      toast({
        title: "Error",
        description: "Failed to import prompts",
        variant: "destructive",
      });
      return [];
    } finally {
      setSaving(false);
    }
  };

  const updatePrompt = async (
    id: string,
    updates: Partial<Pick<Prompt, "text" | "tag" | "visibility_score" | "location_country">>
  ) => {
    try {
      const { error } = await supabase.from("prompts").update(updates).eq("id", id);

      if (error) throw error;

      setPrompts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    } catch (error) {
      console.error("Error updating prompt:", error);
      toast({
        title: "Error",
        description: "Failed to update prompt",
        variant: "destructive",
      });
    }
  };

  const deletePrompt = async (id: string) => {
    try {
      const { error } = await supabase.from("prompts").delete().eq("id", id);

      if (error) throw error;

      setPrompts((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Error deleting prompt:", error);
      toast({
        title: "Error",
        description: "Failed to delete prompt",
        variant: "destructive",
      });
    }
  };

  const savePromptResults = async (
    promptId: string,
    results: Array<{
      model: string;
      brand_mentioned: boolean;
      sentiment: string | null;
      rank: number | null;
      response_text?: string;
      citations?: any[];
    }>
  ) => {
    try {
      const resultRecords = results.map((r) => ({
        prompt_id: promptId,
        model: r.model,
        brand_mentioned: r.brand_mentioned,
        sentiment: r.sentiment,
        rank: r.rank,
        response_text: r.response_text || null,
        citations: r.citations || [],
      }));

      const { data, error } = await supabase
        .from("prompt_results")
        .insert(resultRecords)
        .select();

      if (error) throw error;

      // Update local state
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === promptId
            ? { ...p, results: [...p.results, ...(data || [])] }
            : p
        )
      );

      return data;
    } catch (error) {
      console.error("Error saving prompt results:", error);
      throw error;
    }
  };

  return {
    prompts,
    loading,
    saving,
    addPrompt,
    bulkAddPrompts,
    updatePrompt,
    deletePrompt,
    savePromptResults,
    refetch: fetchPrompts,
  };
}
