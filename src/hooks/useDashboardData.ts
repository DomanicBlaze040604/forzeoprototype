import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { subDays, format, startOfDay, parseISO } from "date-fns";

interface PromptResult {
  id: string;
  prompt_id: string;
  model: string;
  brand_mentioned: boolean;
  sentiment: string | null;
  rank: number | null;
  analyzed_at: string;
}

interface Prompt {
  id: string;
  text: string;
  visibility_score: number | null;
  created_at: string;
  tag: string | null;
}

interface DashboardData {
  brandPresence: number;
  averageRank: number;
  positiveMentions: number;
  negativeMentions: number;
  totalMentions: number;
  visibilityTrend: Array<{ date: string; value: number }>;
  topicBreakdown: Array<{ topic: string; visibility: number; count: number }>;
  competitorData: Array<{ name: string; mentions: number; avgRank: number }>;
  recentPrompts: Prompt[];
}

export function useDashboardData(brandId?: string, dateRange = 7) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    fetchDashboardData();
  }, [user, brandId, dateRange]);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const startDate = subDays(new Date(), dateRange).toISOString();

      // Fetch prompts
      const { data: prompts, error: promptsError } = await supabase
        .from("prompts")
        .select("*")
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });

      if (promptsError) throw promptsError;

      // Fetch prompt results
      const promptIds = prompts?.map((p) => p.id) || [];
      let results: PromptResult[] = [];

      if (promptIds.length > 0) {
        const { data: resultsData, error: resultsError } = await supabase
          .from("prompt_results")
          .select("*")
          .in("prompt_id", promptIds);

        if (resultsError) throw resultsError;
        results = resultsData || [];
      }

      // Calculate metrics
      const totalResults = results.length;
      const mentionedResults = results.filter((r) => r.brand_mentioned);
      const brandPresence = totalResults > 0 ? (mentionedResults.length / totalResults) * 100 : 0;

      const rankedResults = results.filter((r) => r.rank !== null);
      const averageRank =
        rankedResults.length > 0
          ? rankedResults.reduce((sum, r) => sum + (r.rank || 0), 0) / rankedResults.length
          : 0;

      const positiveMentions = mentionedResults.filter(
        (r) => r.sentiment === "positive"
      ).length;
      const negativeMentions = mentionedResults.filter(
        (r) => r.sentiment === "negative"
      ).length;

      // Build visibility trend (last N days)
      const visibilityTrend: Array<{ date: string; value: number }> = [];
      for (let i = dateRange - 1; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

        const dayPrompts = prompts?.filter((p) => {
          const promptDate = parseISO(p.created_at);
          return promptDate >= dayStart && promptDate <= dayEnd;
        }) || [];

        const dayPromptIds = dayPrompts.map((p) => p.id);
        const dayResults = results.filter((r) => dayPromptIds.includes(r.prompt_id));
        const dayMentioned = dayResults.filter((r) => r.brand_mentioned).length;
        const dayVisibility =
          dayResults.length > 0 ? (dayMentioned / dayResults.length) * 100 : 0;

        visibilityTrend.push({
          date: format(day, "MMM dd"),
          value: Math.round(dayVisibility * 10) / 10,
        });
      }

      // Topic breakdown
      const topicMap = new Map<string, { visibility: number[]; count: number }>();
      prompts?.forEach((p) => {
        const topic = p.tag || "Uncategorized";
        const promptResults = results.filter((r) => r.prompt_id === p.id);
        const mentioned = promptResults.filter((r) => r.brand_mentioned).length;
        const visibility =
          promptResults.length > 0 ? (mentioned / promptResults.length) * 100 : 0;

        if (!topicMap.has(topic)) {
          topicMap.set(topic, { visibility: [], count: 0 });
        }
        const topicData = topicMap.get(topic)!;
        topicData.visibility.push(visibility);
        topicData.count++;
      });

      const topicBreakdown = Array.from(topicMap.entries()).map(([topic, data]) => ({
        topic,
        visibility:
          Math.round(
            (data.visibility.reduce((a, b) => a + b, 0) / data.visibility.length) * 10
          ) / 10,
        count: data.count,
      }));

      // Mock competitor data (would come from analysis in real implementation)
      const competitorData = [
        { name: "Salesforce", mentions: 45, avgRank: 1.2 },
        { name: "HubSpot", mentions: 38, avgRank: 2.1 },
        { name: "Zoho CRM", mentions: 22, avgRank: 3.5 },
        { name: "Pipedrive", mentions: 15, avgRank: 4.2 },
      ];

      setData({
        brandPresence: Math.round(brandPresence * 10) / 10,
        averageRank: Math.round(averageRank * 10) / 10,
        positiveMentions,
        negativeMentions,
        totalMentions: mentionedResults.length,
        visibilityTrend,
        topicBreakdown,
        competitorData,
        recentPrompts: prompts?.slice(0, 5) || [],
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, refetch: fetchDashboardData };
}
