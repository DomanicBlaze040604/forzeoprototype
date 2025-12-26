import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { useCostTracking } from "./useCostTracking";

interface PipelineConfig {
  engines?: string[];
  includeReddit?: boolean;
  includeQuora?: boolean;
  generateAnswers?: boolean;
  detectMentions?: boolean;
  calculateScores?: boolean;
  verifyCitations?: boolean;
}

interface Brand {
  name: string;
  aliases?: string[];
  domains?: string[];
}

interface Competitor {
  name: string;
  aliases?: string[];
}

interface PipelineResult {
  promptId: string;
  prompt: string;
  searchResults: any;
  aiAnswers: any[];
  mentionResults: any[];
  scores: any;
  citations: any[];
  status: "completed" | "partial" | "failed";
  errors: string[];
  processingTime: number;
}

export function useAnalysisPipeline() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PipelineResult[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkLimits } = useCostTracking();

  const runPipeline = useCallback(async (
    prompt: string,
    brand: Brand,
    competitors: Competitor[] = [],
    config: PipelineConfig = {}
  ): Promise<PipelineResult | null> => {
    if (!user) return null;
    
    // Check cost limits before running
    const limitCheck = checkLimits();
    if (!limitCheck.allowed) {
      toast({
        title: "Cost Limit Reached",
        description: limitCheck.reason,
        variant: "destructive",
      });
      return null;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("analysis-pipeline", {
        body: { prompt, brand, competitors, config },
      });
      
      if (error) throw error;
      
      setResults(prev => [data, ...prev]);
      
      if (data.status === "completed") {
        toast({
          title: "Analysis Complete",
          description: `Processed in ${data.processingTime}ms`,
        });
      } else if (data.status === "partial") {
        toast({
          title: "Partial Results",
          description: `Some steps failed: ${data.errors.length} errors`,
          variant: "destructive",
        });
      }
      
      return data;
    } catch (err) {
      toast({
        title: "Pipeline Error",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, toast, checkLimits]);

  const runBatchPipeline = useCallback(async (
    prompts: string[],
    brand: Brand,
    competitors: Competitor[] = [],
    config: PipelineConfig = {}
  ): Promise<PipelineResult[]> => {
    const batchResults: PipelineResult[] = [];
    
    toast({
      title: "Batch Analysis Started",
      description: `Processing ${prompts.length} prompts...`,
    });
    
    for (const prompt of prompts) {
      const result = await runPipeline(prompt, brand, competitors, config);
      if (result) {
        batchResults.push(result);
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    toast({
      title: "Batch Complete",
      description: `Processed ${batchResults.length}/${prompts.length} prompts`,
    });
    
    return batchResults;
  }, [runPipeline, toast]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    loading,
    results,
    runPipeline,
    runBatchPipeline,
    clearResults,
  };
}
