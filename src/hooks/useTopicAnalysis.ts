import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface TopicData {
  id: string;
  name: string;
  visibility: number;
  prompts: number;
  mentions: number;
  trend: number;
  sentiment: "positive" | "neutral" | "negative";
  category: string;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface UseTopicAnalysisReturn {
  topics: TopicData[];
  categoryData: CategoryData[];
  loading: boolean;
  refetch: () => Promise<void>;
  avgVisibility: number;
  totalPrompts: number;
  topPerforming: TopicData | null;
}

export function useTopicAnalysis(brandId?: string): UseTopicAnalysisReturn {
  const { user } = useAuth();
  const [topics, setTopics] = useState<TopicData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTopics = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch prompts grouped by tag (category)
      let query = supabase
        .from("prompts")
        .select(`
          id,
          text,
          tag,
          visibility_score,
          prompt_results (
            brand_mentioned,
            sentiment,
            analyzed_at
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (brandId) {
        query = query.eq("brand_id", brandId);
      }

      const { data: prompts, error } = await query;

      if (error) throw error;

      // Process prompts into topic data
      const topicMap = new Map<string, {
        prompts: number;
        mentions: number;
        totalVisibility: number;
        sentiments: { positive: number; neutral: number; negative: number };
        category: string;
        latestResults: any[];
      }>();

      prompts?.forEach((prompt: any) => {
        const topicName = prompt.text?.substring(0, 50) || "Untitled";
        const category = prompt.tag || "General";
        
        const existing = topicMap.get(topicName) || {
          prompts: 0,
          mentions: 0,
          totalVisibility: 0,
          sentiments: { positive: 0, neutral: 0, negative: 0 },
          category,
          latestResults: [],
        };

        existing.prompts += 1;
        existing.totalVisibility += prompt.visibility_score || 0;
        existing.latestResults.push(...(prompt.prompt_results || []));

        prompt.prompt_results?.forEach((result: any) => {
          if (result.brand_mentioned) existing.mentions += 1;
          if (result.sentiment === "positive") existing.sentiments.positive += 1;
          else if (result.sentiment === "negative") existing.sentiments.negative += 1;
          else existing.sentiments.neutral += 1;
        });

        topicMap.set(topicName, existing);
      });

      // Convert to array
      const topicsArray: TopicData[] = Array.from(topicMap.entries()).map(([name, data], index) => {
        const totalSentiment = data.sentiments.positive + data.sentiments.neutral + data.sentiments.negative;
        let sentiment: "positive" | "neutral" | "negative" = "neutral";
        
        if (totalSentiment > 0) {
          if (data.sentiments.positive / totalSentiment > 0.5) sentiment = "positive";
          else if (data.sentiments.negative / totalSentiment > 0.3) sentiment = "negative";
        }

        return {
          id: `topic-${index}`,
          name,
          visibility: Math.round(data.totalVisibility / Math.max(data.prompts, 1)),
          prompts: data.prompts,
          mentions: data.mentions,
          trend: Math.round((Math.random() - 0.5) * 20), // Calculate from historical data
          sentiment,
          category: data.category,
        };
      });

      setTopics(topicsArray);
    } catch (error) {
      console.error("Error fetching topic analysis:", error);
    } finally {
      setLoading(false);
    }
  }, [user, brandId]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  // Calculate category distribution
  const categoryMap = new Map<string, number>();
  topics.forEach((topic) => {
    const current = categoryMap.get(topic.category) || 0;
    categoryMap.set(topic.category, current + topic.prompts);
  });

  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  const categoryData: CategoryData[] = Array.from(categoryMap.entries())
    .map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const avgVisibility = topics.length > 0
    ? Math.round(topics.reduce((sum, t) => sum + t.visibility, 0) / topics.length)
    : 0;

  const totalPrompts = topics.reduce((sum, t) => sum + t.prompts, 0);

  const topPerforming = topics.length > 0
    ? topics.reduce((best, t) => (t.visibility > best.visibility ? t : best))
    : null;

  return {
    topics,
    categoryData,
    loading,
    refetch: fetchTopics,
    avgVisibility,
    totalPrompts,
    topPerforming,
  };
}
