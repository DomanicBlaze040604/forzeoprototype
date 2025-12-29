/**
 * FORZEO MVP Analysis Hook
 * 
 * Connects frontend to MVP backend APIs:
 * - POST /execute-prompt
 * - POST /visibility-score
 * - POST /ai-summary
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ParsedEntities {
  brandMentions: Array<{
    text: string;
    position: number;
    context: string;
    sentiment: "positive" | "neutral" | "negative";
  }>;
  competitorMentions: Array<{
    name: string;
    count: number;
    positions: number[];
    sentiment: "positive" | "neutral" | "negative";
  }>;
  orderedLists: Array<{
    items: string[];
    brandPosition: number | null;
    competitorPositions: Array<{ name: string; position: number }>;
  }>;
  citations: Array<{
    url: string;
    title: string;
    domain: string;
    snippet?: string;
    position?: number;
  }>;
}

export interface SourceResult {
  source: string;
  raw_response: string;
  parsed_entities: ParsedEntities;
  metadata: {
    response_length: number;
    brand_mention_count: number;
    competitor_mention_count: number;
    list_count: number;
    citation_count: number;
    cost?: number;
    task_id?: string;
  };
}

export interface ExecutePromptResult {
  prompt: string;
  brand: string;
  competitors: string[];
  raw_response: string;
  parsed_entities: ParsedEntities;
  metadata: {
    data_source: string;
    dataforseo_balance?: number;
    response_length: number;
    brand_mention_count: number;
    competitor_mention_count: number;
    list_count: number;
    citation_count: number;
    total_cost?: number;
    timestamp: string;
  };
  // Individual source results
  sources: {
    dataforseo: SourceResult | null;
    groq: SourceResult | null;
    combined: SourceResult | null;
  };
}

export interface VisibilityScoreResult {
  visibilityScore: number;
  scoreBreakdown: {
    mentionScore: number;
    coverageScore: number;
    positionScore: number;
    totalScore: number;
  };
  mentionCount: number;
  positionInLists: number | null;
  competitors: Array<{
    name: string;
    mentionCount: number;
    shareOfVoice: number;
    avgPosition: number | null;
    sentiment: "positive" | "neutral" | "negative";
  }>;
  brandSentiment: "positive" | "neutral" | "negative";
  summary: string;
}

export interface AISummaryResult {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  competitorComparison: string;
  actionItems: string[];
}

export interface MVPAnalysisResult {
  executePrompt: ExecutePromptResult | null;
  visibilityScore: VisibilityScoreResult | null;
  aiSummary: AISummaryResult | null;
}

export function useMVPAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MVPAnalysisResult | null>(null);

  // Execute prompt and get raw response + parsed entities
  const executePrompt = useCallback(async (
    prompt: string,
    brand: string,
    competitors: string[] = []
  ): Promise<ExecutePromptResult | null> => {
    try {
      console.log("[useMVPAnalysis] Executing prompt...", { prompt, brand, competitors });
      
      const { data, error: fnError } = await supabase.functions.invoke("execute-prompt", {
        body: { prompt, brand, competitors },
      });

      console.log("[useMVPAnalysis] execute-prompt response:", { data, error: fnError });

      if (fnError) {
        console.error("[useMVPAnalysis] Function error:", fnError);
        throw new Error(fnError.message || "Failed to call execute-prompt");
      }

      if (!data) {
        throw new Error("No data returned from execute-prompt");
      }

      if (!data.success) {
        throw new Error(data.error || "execute-prompt returned failure");
      }

      return data.data as ExecutePromptResult;
    } catch (err) {
      console.error("[useMVPAnalysis] executePrompt error:", err);
      throw err;
    }
  }, []);

  // Get visibility score with breakdown
  const getVisibilityScore = useCallback(async (
    prompt: string,
    brand: string,
    competitors: string[] = [],
    rawResponse?: string,
    parsedEntities?: any
  ): Promise<VisibilityScoreResult | null> => {
    try {
      console.log("[useMVPAnalysis] Getting visibility score...");
      
      const { data, error: fnError } = await supabase.functions.invoke("visibility-score", {
        body: { prompt, brand, competitors, rawResponse, parsedEntities },
      });

      console.log("[useMVPAnalysis] visibility-score response:", { success: data?.success, error: fnError });

      if (fnError) {
        console.error("[useMVPAnalysis] visibility-score error:", fnError);
        throw new Error(fnError.message || "Failed to call visibility-score");
      }

      if (!data) {
        throw new Error("No data returned from visibility-score");
      }

      if (!data.success) {
        throw new Error(data.error || "visibility-score returned failure");
      }

      return data.data as VisibilityScoreResult;
    } catch (err) {
      console.error("[useMVPAnalysis] getVisibilityScore error:", err);
      throw err;
    }
  }, []);

  // Get AI-generated summary
  const getAISummary = useCallback(async (
    prompt: string,
    brand: string,
    competitors: string[] = [],
    visibilityScore?: number,
    mentionCount?: number,
    positionInLists?: number | null,
    competitorData?: any[],
    sentiment?: string
  ): Promise<AISummaryResult | null> => {
    try {
      console.log("[useMVPAnalysis] Getting AI summary...");
      
      const { data, error: fnError } = await supabase.functions.invoke("ai-summary", {
        body: { 
          prompt, 
          brand, 
          competitors,
          visibilityScore,
          mentionCount,
          positionInLists,
          competitorData,
          sentiment
        },
      });

      console.log("[useMVPAnalysis] ai-summary response:", { success: data?.success, error: fnError });

      if (fnError) {
        console.error("[useMVPAnalysis] ai-summary error:", fnError);
        throw new Error(fnError.message || "Failed to call ai-summary");
      }

      if (!data) {
        throw new Error("No data returned from ai-summary");
      }

      if (!data.success) {
        throw new Error(data.error || "ai-summary returned failure");
      }

      return data.data as AISummaryResult;
    } catch (err) {
      console.error("[useMVPAnalysis] getAISummary error:", err);
      throw err;
    }
  }, []);

  // Full analysis: execute prompt → get score → get summary
  const runFullAnalysis = useCallback(async (
    prompt: string,
    brand: string,
    competitors: string[] = []
  ): Promise<MVPAnalysisResult> => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Execute prompt
      console.log("[useMVPAnalysis] Step 1: Execute prompt");
      const executeResult = await executePrompt(prompt, brand, competitors);

      if (!executeResult) {
        throw new Error("Failed to execute prompt");
      }

      // Step 2: Get visibility score (pass pre-fetched data)
      console.log("[useMVPAnalysis] Step 2: Get visibility score");
      const scoreResult = await getVisibilityScore(
        prompt,
        brand,
        competitors,
        executeResult.raw_response,
        executeResult.parsed_entities
      );

      // Step 3: Get AI summary (pass pre-computed data)
      console.log("[useMVPAnalysis] Step 3: Get AI summary");
      const summaryResult = await getAISummary(
        prompt,
        brand,
        competitors,
        scoreResult?.visibilityScore,
        scoreResult?.mentionCount,
        scoreResult?.positionInLists,
        scoreResult?.competitors,
        scoreResult?.brandSentiment
      );

      const fullResult: MVPAnalysisResult = {
        executePrompt: executeResult,
        visibilityScore: scoreResult,
        aiSummary: summaryResult,
      };

      setResult(fullResult);
      return fullResult;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Analysis failed";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [executePrompt, getVisibilityScore, getAISummary]);

  // Reset state
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    result,
    executePrompt,
    getVisibilityScore,
    getAISummary,
    runFullAnalysis,
    reset,
  };
}
