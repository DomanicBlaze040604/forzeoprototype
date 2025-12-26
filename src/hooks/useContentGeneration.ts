import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GeneratedContent {
  id: string;
  topic: string;
  contentType: string;
  model: string;
  content: string;
  createdAt: string;
}

export interface ContentGenerationParams {
  topic: string;
  contentType: string;
  model: string;
  brandVoice: string;
  referenceUrls?: string[];
}

const STORAGE_KEY = "forzeo_content_history";

export function useContentGeneration() {
  const [history, setHistory] = useState<GeneratedContent[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to parse content history:", e);
    }
  }, []);

  const saveToHistory = useCallback((content: GeneratedContent) => {
    setHistory(prev => {
      const updated = [content, ...prev].slice(0, 20);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const generateContent = useCallback(async (params: ContentGenerationParams): Promise<string | null> => {
    setGenerating(true);
    setError(null);

    const contentTypeDescriptions: Record<string, string> = {
      blog: "a comprehensive blog post with introduction, main sections, and conclusion",
      comparison: "a detailed product comparison article with pros/cons and recommendations",
      listicle: "an engaging numbered list article with detailed explanations for each item",
      guide: "a comprehensive buyer's guide with expert recommendations",
      review: "an in-depth product review with features, pros, cons, and verdict",
    };

    const voiceInstructions: Record<string, string> = {
      professional: "Use a professional, authoritative tone suitable for business audiences. Be formal but accessible.",
      casual: "Use a friendly, conversational tone that's easy to read. Be approachable and engaging.",
      technical: "Use precise technical language with detailed specifications. Be thorough and data-driven.",
    };

    const contentPrompt = `Write ${contentTypeDescriptions[params.contentType] || "an article"} about: ${params.topic}

Writing Style: ${voiceInstructions[params.brandVoice] || voiceInstructions.professional}

Requirements:
1. Create content optimized for AI search visibility
2. Include clear, factual information that AI models would reference
3. Use proper Markdown formatting with headers (##, ###)
4. Include bullet points and numbered lists where appropriate
5. Provide actionable recommendations
6. Target length: 800-1200 words
7. Include a compelling introduction and strong conclusion
${params.referenceUrls?.length ? `\nReference style from: ${params.referenceUrls.join(", ")}` : ""}

Write the complete article now:`;

    const systemPrompt = `You are an expert content writer specializing in SEO-optimized content for AI visibility.
Your content should be:
- Well-structured with clear headings
- Factual and authoritative
- Easy for AI models to parse and reference
- Engaging and valuable to readers

Always format your response in clean Markdown.`;

    try {
      let content = "";
      
      // Try the generate-content function first
      try {
        console.log("Calling generate-content function...");
        const { data, error: fnError } = await supabase.functions.invoke("generate-content", {
          body: {
            prompt: contentPrompt,
            systemPrompt,
            type: "full_content",
          },
        });

        if (!fnError && data?.response) {
          content = data.response;
          console.log(`Generated ${content.length} chars via generate-content`);
        } else if (fnError) {
          console.log("generate-content error:", fnError.message);
        }
      } catch (e) {
        console.log("generate-content failed:", e);
      }
      
      // If no content, try analyze-prompt as fallback (it uses Groq too)
      if (!content || content.length < 100) {
        console.log("Trying analyze-prompt as fallback...");
        try {
          const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke("analyze-prompt", {
            body: {
              prompt: `Write a detailed article about: ${params.topic}. Include an introduction, main points with explanations, and a conclusion. Format in Markdown with headers.`,
              brand: "FORZEO",
              models: ["ChatGPT"],
            },
          });
          
          if (!fallbackError && fallbackData?.results?.[0]?.full_response) {
            content = fallbackData.results[0].full_response;
            console.log(`Generated ${content.length} chars via analyze-prompt fallback`);
          } else if (fallbackError) {
            console.log("analyze-prompt error:", fallbackError.message);
          }
        } catch (e) {
          console.log("analyze-prompt fallback failed:", e);
        }
      }

      if (!content || content.length < 100) {
        throw new Error("Could not generate content. Please check your API configuration and try again.");
      }

      // Save to history
      saveToHistory({
        id: crypto.randomUUID(),
        topic: params.topic,
        contentType: params.contentType,
        model: params.model,
        content,
        createdAt: new Date().toISOString(),
      });

      return content;
    } catch (err) {
      console.error("Content generation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate content";
      setError(errorMessage);
      return null;
    } finally {
      setGenerating(false);
    }
  }, [saveToHistory]);

  const deleteFromHistory = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    history,
    generating,
    error,
    generateContent,
    deleteFromHistory,
    clearHistory,
  };
}
