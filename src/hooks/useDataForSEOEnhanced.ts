import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

interface AnalysisOptions {
  engines?: string[];
  includeSerp?: boolean;
  includeKeywordData?: boolean;
  includeDomainAnalysis?: boolean;
  includeBacklinks?: boolean;
  includeSentiment?: boolean;
}

interface LLMResponse {
  engine: string;
  response: string;
  citations?: Array<{ url: string; title?: string }>;
  brandMentioned?: boolean;
  mentionCount?: number;
  competitorsMentioned?: string[];
  source?: string;
}

interface AnalysisMetrics {
  visibilityScore: number;
  enginesAnalyzed: number;
  brandMentionedIn: number;
  dataSource: "dataforseo" | "fallback";
  fallbackReason?: string;
}

interface EnhancedAnalysisResult {
  source: "dataforseo" | "fallback";
  balance: number;
  llmResponses: LLMResponse[];
  serpData: any;
  keywordData: any;
  domainAnalysis: any;
  backlinks: any;
  sentimentAnalysis: any;
  brandMentions: any;
  metrics: AnalysisMetrics;
  error?: string;
}

interface BalanceCheck {
  available: boolean;
  balance: number;
  reason?: string;
}

export function useDataForSEOEnhanced() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<"dataforseo" | "fallback" | null>(null);
  const { toast } = useToast();

  const callAPI = useCallback(async (action: string, params: Record<string, any>) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("dataforseo-enhanced", {
        body: { action, ...params },
      });

      if (fnError) throw fnError;

      // Track data source
      if (data?.source) {
        setDataSource(data.source);
        if (data.source === "fallback" && data.metrics?.fallbackReason) {
          toast({
            title: "Using Fallback Mode",
            description: `DataForSEO unavailable: ${data.metrics.fallbackReason}. Using Groq + Serper instead.`,
            variant: "default",
          });
        }
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

  // Full enhanced analysis with all DataForSEO features
  const runEnhancedAnalysis = useCallback(async (
    prompt: string,
    brand: string,
    competitors: string[] = [],
    options: AnalysisOptions = {}
  ): Promise<EnhancedAnalysisResult | null> => {
    return callAPI("analyze", { prompt, brand, competitors, options });
  }, [callAPI]);

  // Check DataForSEO balance
  const checkBalance = useCallback(async (): Promise<BalanceCheck | null> => {
    return callAPI("check_balance", {});
  }, [callAPI]);

  // LLM Scraping - Get real AI responses
  const llmScrape = useCallback(async (
    prompt: string,
    engines: string[] = ["chatgpt", "gemini", "perplexity", "claude"]
  ) => {
    return callAPI("llm_scrape", { prompt, engines });
  }, [callAPI]);

  // SERP Search with automatic fallback
  const serpSearch = useCallback(async (query: string, locationCode?: number) => {
    return callAPI("serp_search", { query, locationCode });
  }, [callAPI]);

  // Keyword Research
  const keywordData = useCallback(async (keywords: string[], locationCode?: number) => {
    return callAPI("keyword_data", { keywords, locationCode });
  }, [callAPI]);

  // Domain Analytics
  const domainAnalysis = useCallback(async (domain: string) => {
    return callAPI("domain_analysis", { domain });
  }, [callAPI]);

  // Backlinks Analysis
  const backlinksAnalysis = useCallback(async (target: string) => {
    return callAPI("backlinks", { target });
  }, [callAPI]);

  // Content Sentiment Analysis
  const sentimentAnalysis = useCallback(async (keyword: string) => {
    return callAPI("sentiment", { keyword });
  }, [callAPI]);

  return {
    loading,
    error,
    dataSource,
    // Main analysis
    runEnhancedAnalysis,
    // Individual features
    checkBalance,
    llmScrape,
    serpSearch,
    keywordData,
    domainAnalysis,
    backlinksAnalysis,
    sentimentAnalysis,
  };
}

// Hook for displaying DataForSEO status with balance info
export function useDataForSEOStatus() {
  const [status, setStatus] = useState<{
    checking: boolean;
    isConnected: boolean;
    isSimulated: boolean;
    balance: number;
    balanceFormatted: string;
    lowBalance: boolean;
    errorMessage: string | null;
  }>({
    checking: true,
    isConnected: false,
    isSimulated: false,
    balance: 0,
    balanceFormatted: "$0.00",
    lowBalance: false,
    errorMessage: null,
  });

  const checkStatus = useCallback(async () => {
    setStatus(prev => ({ ...prev, checking: true }));

    try {
      const { data, error } = await supabase.functions.invoke("dataforseo-enhanced", {
        body: { action: "check_balance" },
      });

      if (error) {
        setStatus({
          checking: false,
          isConnected: false,
          isSimulated: true,
          balance: 0,
          balanceFormatted: "$0.00",
          lowBalance: true,
          errorMessage: error.message,
        });
        return;
      }

      const balance = data?.balance || 0;
      const isConnected = data?.available === true;

      setStatus({
        checking: false,
        isConnected,
        isSimulated: !isConnected,
        balance,
        balanceFormatted: `$${balance.toFixed(2)}`,
        lowBalance: balance < 5,
        errorMessage: data?.reason || null,
      });
    } catch (err) {
      setStatus({
        checking: false,
        isConnected: false,
        isSimulated: true,
        balance: 0,
        balanceFormatted: "$0.00",
        lowBalance: true,
        errorMessage: err instanceof Error ? err.message : "Connection failed",
      });
    }
  }, []);

  return { ...status, checkStatus };
}
