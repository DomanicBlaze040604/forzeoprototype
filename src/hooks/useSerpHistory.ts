import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SerpHistoryEntry {
  id: string;
  prompt_id: string;
  brand_id: string;
  location_country: string;
  brand_in_serp: boolean;
  serp_position: number | null;
  ai_overview_mentioned: boolean;
  competitor_positions: Array<{ name: string; position: number }>;
  top_results: Array<{ title: string; link: string; snippet: string; position: number }>;
  recorded_at: string;
}

export function useSerpHistory(promptId?: string, brandId?: string) {
  const [history, setHistory] = useState<SerpHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!promptId && !brandId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("serp_history")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(30);

      if (promptId) {
        query = query.eq("prompt_id", promptId);
      } else if (brandId) {
        query = query.eq("brand_id", brandId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our interface
      const transformedData: SerpHistoryEntry[] = (data || []).map((item: any) => ({
        id: item.id,
        prompt_id: item.prompt_id,
        brand_id: item.brand_id,
        location_country: item.location_country,
        brand_in_serp: item.brand_in_serp,
        serp_position: item.serp_position,
        ai_overview_mentioned: item.ai_overview_mentioned,
        competitor_positions: Array.isArray(item.competitor_positions) ? item.competitor_positions : [],
        top_results: Array.isArray(item.top_results) ? item.top_results : [],
        recorded_at: item.recorded_at,
      }));

      setHistory(transformedData);
    } catch (error) {
      console.error("Error fetching SERP history:", error);
    } finally {
      setLoading(false);
    }
  }, [promptId, brandId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Get position trend data for charts
  const getPositionTrend = useCallback(() => {
    return history
      .filter((h) => h.serp_position !== null)
      .map((h) => ({
        date: new Date(h.recorded_at).toLocaleDateString(),
        position: h.serp_position,
        country: h.location_country,
      }))
      .reverse();
  }, [history]);

  // Get visibility trend (brand in SERP over time)
  const getVisibilityTrend = useCallback(() => {
    return history
      .map((h) => ({
        date: new Date(h.recorded_at).toLocaleDateString(),
        visible: h.brand_in_serp ? 1 : 0,
        aiMentioned: h.ai_overview_mentioned ? 1 : 0,
        country: h.location_country,
      }))
      .reverse();
  }, [history]);

  return {
    history,
    loading,
    refetch: fetchHistory,
    getPositionTrend,
    getVisibilityTrend,
  };
}
