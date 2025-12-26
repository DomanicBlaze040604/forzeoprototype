import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface GapPrompt {
  id: string;
  prompt: string;
  topic: string;
  estimatedVolume: number;
  llmsMissing: string[];
  lastAnalyzed: string;
  totalModels: number;
}

export interface ContentBrief {
  title: string;
  description: string;
  targetKeywords: string[];
  contentType: string;
}

// Demo data for when no real data exists
const DEMO_GAP_PROMPTS: GapPrompt[] = [
  {
    id: "demo-1",
    prompt: "best wireless earbuds under 2000",
    topic: "Wireless Earbuds",
    estimatedVolume: 349810,
    llmsMissing: ["Google AI Overview", "GPT-4"],
    lastAnalyzed: new Date().toISOString(),
    totalModels: 6,
  },
  {
    id: "demo-2",
    prompt: "portable bluetooth speakers for travel",
    topic: "Bluetooth Speakers",
    estimatedVolume: 245067,
    llmsMissing: ["GPT-4", "Perplexity"],
    lastAnalyzed: new Date().toISOString(),
    totalModels: 6,
  },
  {
    id: "demo-3",
    prompt: "budget smartwatch with heart rate monitor",
    topic: "Smartwatch",
    estimatedVolume: 337879,
    llmsMissing: ["Google AI Overview"],
    lastAnalyzed: new Date().toISOString(),
    totalModels: 6,
  },
  {
    id: "demo-4",
    prompt: "noise cancelling earbuds cheap",
    topic: "Wireless Earbuds",
    estimatedVolume: 289450,
    llmsMissing: ["Bing Copilot", "GPT-4"],
    lastAnalyzed: new Date().toISOString(),
    totalModels: 6,
  },
  {
    id: "demo-5",
    prompt: "best TWS earbuds for gaming",
    topic: "Wireless Earbuds",
    estimatedVolume: 198234,
    llmsMissing: ["Perplexity", "Claude"],
    lastAnalyzed: new Date().toISOString(),
    totalModels: 6,
  },
];

export function useGapAnalysis() {
  const [gapPrompts, setGapPrompts] = useState<GapPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const { user } = useAuth();

  const fetchGapPrompts = useCallback(async () => {
    if (!user) {
      setGapPrompts(DEMO_GAP_PROMPTS);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Fetch prompts with their engine results
      const { data: prompts, error: promptsError } = await supabase
        .from("prompts")
        .select(`
          id,
          text,
          topic_cluster,
          created_at,
          engine_results (
            engine,
            brand_mentioned,
            analyzed_at
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (promptsError) throw promptsError;

      const allEngines = ["chatgpt", "gemini", "perplexity", "claude", "google_ai_mode", "bing_copilot"];
      const engineDisplayNames: Record<string, string> = {
        chatgpt: "ChatGPT",
        gemini: "Gemini",
        perplexity: "Perplexity",
        claude: "Claude",
        google_ai_mode: "Google AI Overview",
        bing_copilot: "Bing Copilot",
      };

      const gaps: GapPrompt[] = [];

      for (const prompt of prompts || []) {
        const results = (prompt as any).engine_results || [];
        const mentionedEngines = results
          .filter((r: any) => r.brand_mentioned)
          .map((r: any) => r.engine);
        
        // Find engines where brand was NOT mentioned
        const analyzedEngines = results.map((r: any) => r.engine);
        const missingEngines = analyzedEngines.filter((e: string) => 
          !results.find((r: any) => r.engine === e && r.brand_mentioned)
        );
        
        if (missingEngines.length > 0) {
          gaps.push({
            id: prompt.id,
            prompt: prompt.text,
            topic: prompt.topic_cluster || "General",
            estimatedVolume: Math.floor(Math.random() * 500000) + 10000,
            llmsMissing: missingEngines.map((e: string) => engineDisplayNames[e] || e),
            lastAnalyzed: results[0]?.analyzed_at || prompt.created_at,
            totalModels: allEngines.length,
          });
        }
      }

      // If no real gaps found, use demo data
      if (gaps.length === 0) {
        setGapPrompts(DEMO_GAP_PROMPTS);
      } else {
        gaps.sort((a, b) => b.llmsMissing.length - a.llmsMissing.length);
        setGapPrompts(gaps);
      }
    } catch (err) {
      console.error("Failed to fetch gap analysis:", err);
      setError(err instanceof Error ? err.message : "Failed to load gap analysis");
      // Use demo data on error
      setGapPrompts(DEMO_GAP_PROMPTS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const generateContentBrief = useCallback(async (prompt: string, topic: string): Promise<ContentBrief> => {
    setGenerating(true);
    
    const briefPrompt = `Generate a content brief for an article targeting the search query: "${prompt}"

Topic category: ${topic}

Respond with ONLY a JSON object (no markdown, no explanation):
{
  "title": "A compelling SEO-optimized title",
  "description": "A 2-3 sentence content brief describing what the article should cover to rank for this query",
  "targetKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "contentType": "listicle" or "guide" or "comparison" or "review"
}`;

    try {
      // Try generate-content first
      let responseText = "";
      
      try {
        console.log("Generating content brief via generate-content...");
        const { data, error } = await supabase.functions.invoke("generate-content", {
          body: {
            prompt: briefPrompt,
            systemPrompt: "You are a content strategist. Respond with valid JSON only, no markdown formatting.",
            type: "content_brief",
          },
        });

        if (!error && data?.response) {
          responseText = data.response;
          console.log(`Got brief response: ${responseText.length} chars`);
        } else if (error) {
          console.log("generate-content error:", error.message);
        }
      } catch (e) {
        console.log("generate-content failed:", e);
      }

      // Fallback to analyze-prompt if needed
      if (!responseText) {
        console.log("Trying analyze-prompt fallback for content brief...");
        try {
          const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke("analyze-prompt", {
            body: {
              prompt: briefPrompt,
              brand: "content",
              models: ["ChatGPT"],
            },
          });
          
          if (!fallbackError && fallbackData?.results?.[0]?.full_response) {
            responseText = fallbackData.results[0].full_response;
            console.log(`Got fallback response: ${responseText.length} chars`);
          } else if (fallbackError) {
            console.log("analyze-prompt error:", fallbackError.message);
          }
        } catch (e) {
          console.log("analyze-prompt fallback failed:", e);
        }
      }

      // Parse the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            title: parsed.title || `Complete Guide: ${prompt}`,
            description: parsed.description || `Create comprehensive content addressing "${prompt}" to improve AI visibility.`,
            targetKeywords: parsed.targetKeywords || [prompt, topic, "best", "guide", "2025"],
            contentType: parsed.contentType || "guide",
          };
        } catch (parseErr) {
          console.error("JSON parse error:", parseErr);
        }
      }

      // Fallback brief
      return {
        title: `Complete Guide: ${prompt}`,
        description: `Create comprehensive content addressing "${prompt}" to improve AI visibility. Focus on providing detailed, authoritative information that AI models can reference.`,
        targetKeywords: [prompt, topic, "best", "guide", "2025"],
        contentType: "guide",
      };
    } catch (err) {
      console.error("Failed to generate content brief:", err);
      // Return fallback on error
      return {
        title: `Complete Guide: ${prompt}`,
        description: `Create comprehensive content addressing "${prompt}" to improve AI visibility. Focus on providing detailed, authoritative information.`,
        targetKeywords: [prompt, topic, "best", "guide", "2025"],
        contentType: "guide",
      };
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    fetchGapPrompts();
  }, [fetchGapPrompts]);

  return {
    gapPrompts,
    loading,
    error,
    generating,
    refresh: fetchGapPrompts,
    generateContentBrief,
  };
}
