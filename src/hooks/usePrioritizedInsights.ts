import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PrioritizedInsight {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  severity_score: number;
  confidence_score: number;
  estimated_effort: "low" | "medium" | "high";
  estimated_upside: number;
  priority_rank: number;
  recommended_action: string;
  action_category: string;
  impact_explanation: string;
  engine_authority_context: Record<string, any>;
  affected_prompts: string[];
  affected_engines: string[];
  status: "new" | "acknowledged" | "in_progress" | "completed" | "dismissed";
  created_at: string;
  valid_until?: string;
  // Decision compression fields
  single_action_summary?: string;
  opportunity_cost?: string;
  why_rank_one?: string;
  assigned_to?: string;
  assigned_at?: string;
  deadline?: string;
  sla_hours?: number;
  overdue?: boolean;
}

export interface InsightInput {
  type: string;
  title: string;
  description: string;
  brandId?: string;
  affectedPrompts?: string[];
  affectedEngines?: string[];
  currentScore?: number;
  previousScore?: number;
  competitorData?: any;
  engineAuthorityContext?: any;
}

export function usePrioritizedInsights(brandId?: string) {
  const [weeklyPriorities, setWeeklyPriorities] = useState<PrioritizedInsight[]>([]);
  const [allInsights, setAllInsights] = useState<PrioritizedInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchWeeklyPriorities = useCallback(async (limit: number = 3) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: funcError } = await supabase.functions.invoke("insight-prioritizer", {
        body: {
          action: "getWeeklyPriorities",
          brandId,
          limit,
        },
      });
      
      if (funcError) throw funcError;
      setWeeklyPriorities(data.priorities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch priorities");
    } finally {
      setLoading(false);
    }
  }, [user, brandId]);

  const fetchAllInsights = useCallback(async (
    status?: string,
    limit: number = 20
  ) => {
    if (!user) return;
    
    try {
      const { data, error: funcError } = await supabase.functions.invoke("insight-prioritizer", {
        body: {
          action: "getAllInsights",
          brandId,
          status,
          limit,
        },
      });
      
      if (funcError) throw funcError;
      setAllInsights(data.insights || []);
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    }
  }, [user, brandId]);

  const prioritizeInsights = useCallback(async (
    insights: InsightInput[]
  ): Promise<PrioritizedInsight[]> => {
    try {
      const { data, error: funcError } = await supabase.functions.invoke("insight-prioritizer", {
        body: {
          action: "prioritize",
          insights,
        },
      });
      
      if (funcError) throw funcError;
      return data.insights || [];
    } catch (err) {
      console.error("Failed to prioritize insights:", err);
      return [];
    }
  }, []);

  const storeInsights = useCallback(async (
    insights: any[],
    targetBrandId?: string
  ): Promise<boolean> => {
    try {
      const { error: funcError } = await supabase.functions.invoke("insight-prioritizer", {
        body: {
          action: "store",
          insights,
          brandId: targetBrandId || brandId,
        },
      });
      
      if (funcError) throw funcError;
      
      // Refresh data
      await fetchWeeklyPriorities();
      await fetchAllInsights();
      
      return true;
    } catch (err) {
      console.error("Failed to store insights:", err);
      return false;
    }
  }, [brandId, fetchWeeklyPriorities, fetchAllInsights]);

  const updateInsightStatus = useCallback(async (
    insightId: string,
    status: PrioritizedInsight["status"]
  ): Promise<boolean> => {
    try {
      const { error: funcError } = await supabase.functions.invoke("insight-prioritizer", {
        body: {
          action: "updateStatus",
          insightId,
          status,
        },
      });
      
      if (funcError) throw funcError;
      
      // Update local state
      setWeeklyPriorities(prev => 
        prev.map(i => i.id === insightId ? { ...i, status } : i)
      );
      setAllInsights(prev => 
        prev.map(i => i.id === insightId ? { ...i, status } : i)
      );
      
      return true;
    } catch (err) {
      console.error("Failed to update insight status:", err);
      return false;
    }
  }, []);

  const dismissInsight = useCallback(async (insightId: string) => {
    return updateInsightStatus(insightId, "dismissed");
  }, [updateInsightStatus]);

  const acknowledgeInsight = useCallback(async (insightId: string) => {
    return updateInsightStatus(insightId, "acknowledged");
  }, [updateInsightStatus]);

  const completeInsight = useCallback(async (insightId: string) => {
    return updateInsightStatus(insightId, "completed");
  }, [updateInsightStatus]);

  useEffect(() => {
    if (user) {
      fetchWeeklyPriorities();
      fetchAllInsights();
    }
  }, [user, fetchWeeklyPriorities, fetchAllInsights]);

  // Computed values
  const newInsightsCount = allInsights.filter(i => i.status === "new").length;
  const inProgressCount = allInsights.filter(i => i.status === "in_progress").length;
  const completedCount = allInsights.filter(i => i.status === "completed").length;

  return {
    weeklyPriorities,
    allInsights,
    loading,
    error,
    newInsightsCount,
    inProgressCount,
    completedCount,
    fetchWeeklyPriorities,
    fetchAllInsights,
    prioritizeInsights,
    storeInsights,
    updateInsightStatus,
    dismissInsight,
    acknowledgeInsight,
    completeInsight,
  };
}
