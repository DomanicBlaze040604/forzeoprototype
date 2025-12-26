import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

interface PromptSuggestion {
  text: string;
  tag: string;
  rationale: string;
}

interface UsePromptSuggestionsReturn {
  suggestions: PromptSuggestion[];
  loading: boolean;
  error: string | null;
  generateSuggestions: (params?: {
    industry?: string;
    brandName?: string;
    competitors?: string[];
    existingPrompts?: string[];
  }) => Promise<void>;
  clearSuggestions: () => void;
}

export function usePromptSuggestions(): UsePromptSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<PromptSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateSuggestions = async (params?: {
    industry?: string;
    brandName?: string;
    competitors?: string[];
    existingPrompts?: string[];
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("suggest-prompts", {
        body: {
          industry: params?.industry,
          brandName: params?.brandName,
          competitors: params?.competitors,
          existingPrompts: params?.existingPrompts,
        },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast({
            title: "Rate Limited",
            description: "Too many requests. Please wait a moment and try again.",
            variant: "destructive",
          });
        } else if (data.error.includes("credits")) {
          toast({
            title: "Credits Exhausted",
            description: "AI credits are exhausted. Please add credits to continue.",
            variant: "destructive",
          });
        }
        throw new Error(data.error);
      }

      setSuggestions(data?.suggestions || []);
      
      toast({
        title: "Suggestions Generated",
        description: `Generated ${data?.suggestions?.length || 0} prompt suggestions.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate suggestions";
      setError(message);
      console.error("Error generating suggestions:", err);
    } finally {
      setLoading(false);
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setError(null);
  };

  return {
    suggestions,
    loading,
    error,
    generateSuggestions,
    clearSuggestions,
  };
}
