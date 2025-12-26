import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SerpData {
  brand_in_serp: boolean;
  serp_position: number | null;
  ai_overview: string | null;
  top_organic_results: Array<{ title: string; link: string; snippet: string; position: number }>;
  competitor_serp_positions: Array<{ name: string; position: number }>;
}

interface AnalysisResult {
  results: Array<{
    model: string;
    brand_mentioned: boolean;
    sentiment: string | null;
    rank: number | null;
    response_snippet: string;
    citations: string[];
    competitors_in_response?: string[];
  }>;
  overall_visibility_score: number;
  competitors_mentioned: string[];
  recommendations: string[];
  serp_data?: SerpData | null;
}

interface AnalyzeOptions {
  promptId?: string;
  brandId?: string;
  country?: string;
  persona?: string;
}

export function useAnalyzePrompt() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const analyzePrompt = async (
    prompt: string,
    brand: string,
    models?: string[],
    competitors?: string[],
    options?: AnalyzeOptions
  ): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-prompt", {
        body: { 
          prompt, 
          brand, 
          models, 
          competitors,
          country: options?.country || "US",
          persona: options?.persona || "general",
        },
      });

      if (error) {
        throw error;
      }

      const result = data as AnalysisResult;

      // Save SERP history if we have the required data
      if (result.serp_data && options?.promptId && options?.brandId) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("serp_history").insert({
              user_id: user.id,
              prompt_id: options.promptId,
              brand_id: options.brandId,
              location_country: options.country || "US",
              brand_in_serp: result.serp_data.brand_in_serp,
              serp_position: result.serp_data.serp_position,
              ai_overview_mentioned: result.serp_data.ai_overview?.toLowerCase().includes(brand.toLowerCase()) || false,
              competitor_positions: result.serp_data.competitor_serp_positions || [],
              top_results: result.serp_data.top_organic_results || [],
            });
          }
        } catch (historyError) {
          console.error("Failed to save SERP history:", historyError);
        }
      }

      return result;
    } catch (error) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Could not analyze prompt",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  return { analyzePrompt, isAnalyzing };
}
