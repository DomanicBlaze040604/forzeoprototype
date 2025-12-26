import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

interface LLMScraperTask {
  prompt: string;
  engine?: "chatgpt" | "gemini" | "perplexity" | "claude";
  tag?: string;
}

interface LLMMentionsTask {
  keyword: string;
  target: string;
  engine?: string;
}

interface GoogleAIModeQuery {
  keyword: string;
  location_code?: number;
  language_code?: string;
}

interface APIUsageStats {
  dailyCost: number;
  monthlyCost: number;
  dailyLimit: number;
  monthlyLimit: number;
}

export function useDataForSEO() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const callAPI = useCallback(async (action: string, params: Record<string, any>) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("dataforseo-client", {
        body: { action, ...params },
      });
      
      if (fnError) throw fnError;
      
      if (data?.mock) {
        toast({
          title: "Using Simulated Data",
          description: "DataForSEO API not configured. Results are simulated.",
          variant: "default",
        });
      }
      
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "API call failed";
      setError(message);
      toast({
        title: "API Error",
        description: message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // LLM Scraper APIs
  const llmScraperPost = useCallback(async (prompts: LLMScraperTask[]) => {
    return callAPI("llm_scraper_post", { prompts });
  }, [callAPI]);

  const llmScraperGet = useCallback(async (taskId: string) => {
    return callAPI("llm_scraper_get", { taskId });
  }, [callAPI]);

  // LLM Mentions APIs
  const llmMentionsPost = useCallback(async (data: LLMMentionsTask[]) => {
    return callAPI("llm_mentions_post", { data });
  }, [callAPI]);

  const llmMentionsGet = useCallback(async (taskId: string) => {
    return callAPI("llm_mentions_get", { taskId });
  }, [callAPI]);

  // AI Summary
  const aiSummary = useCallback(async (text: string, maxLength?: number) => {
    return callAPI("ai_summary", { text, maxLength });
  }, [callAPI]);

  // Google AI Mode APIs
  const googleAIModePost = useCallback(async (queries: GoogleAIModeQuery[]) => {
    return callAPI("google_ai_mode_post", { queries });
  }, [callAPI]);

  const googleAIModeGet = useCallback(async (taskId: string) => {
    return callAPI("google_ai_mode_get", { taskId });
  }, [callAPI]);

  // SERP HTML for citation verification
  const serpHtml = useCallback(async (url: string) => {
    return callAPI("serp_html", { url });
  }, [callAPI]);

  // Account Balance
  const getAccountBalance = useCallback(async () => {
    return callAPI("account_balance", {});
  }, [callAPI]);

  // Task Status
  const getTaskStatus = useCallback(async (taskId: string) => {
    return callAPI("task_status", { taskId });
  }, [callAPI]);

  // Poll for task completion
  const pollTaskCompletion = useCallback(async (
    taskId: string,
    getTaskFn: (id: string) => Promise<any>,
    maxAttempts = 30,
    intervalMs = 2000
  ) => {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await getTaskFn(taskId);
      
      if (result?.tasks?.[0]?.status_code === 20000) {
        return result;
      }
      
      if (result?.tasks?.[0]?.status_code >= 40000) {
        throw new Error(result?.tasks?.[0]?.status_message || "Task failed");
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error("Task polling timeout");
  }, []);

  return {
    loading,
    error,
    // LLM Scraper
    llmScraperPost,
    llmScraperGet,
    // LLM Mentions
    llmMentionsPost,
    llmMentionsGet,
    // AI Summary
    aiSummary,
    // Google AI Mode
    googleAIModePost,
    googleAIModeGet,
    // SERP
    serpHtml,
    // Account
    getAccountBalance,
    getTaskStatus,
    // Utilities
    pollTaskCompletion,
  };
}

// Hook for API usage tracking
export function useAPIUsage() {
  const [stats, setStats] = useState<APIUsageStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsageStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data: dailyData } = await supabase.rpc("get_daily_api_cost", {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
      });
      
      const { data: monthlyData } = await supabase.rpc("get_monthly_api_cost", {
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
      });
      
      const { data: alerts } = await supabase
        .from("cost_alerts")
        .select("*")
        .single();
      
      setStats({
        dailyCost: dailyData || 0,
        monthlyCost: monthlyData || 0,
        dailyLimit: alerts?.daily_limit || 10,
        monthlyLimit: alerts?.monthly_limit || 100,
      });
    } catch (err) {
      console.error("Failed to fetch API usage:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, fetchUsageStats };
}
