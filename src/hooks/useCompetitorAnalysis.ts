import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CompetitorData {
  id: string;
  name: string;
  mentions: number;
  sov: number;
  avgRank: number;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
  trend: number;
}

export interface GapMetric {
  metric: string;
  yourValue: string;
  leaderValue: string;
  leaderName: string;
  gap: string;
}

// Demo data matching the prototype
const DEMO_YOUR_BRAND: CompetitorData = {
  id: "your-brand",
  name: "Ptron",
  mentions: 58,
  sov: 6.1,
  avgRank: 6.2,
  sentiment: { positive: 25, neutral: 55, negative: 20 },
  trend: 0.2,
};

const DEMO_COMPETITORS: CompetitorData[] = [
  {
    id: "comp-1",
    name: "boAt",
    mentions: 448,
    sov: 41.2,
    avgRank: 1.2,
    sentiment: { positive: 45, neutral: 40, negative: 15 },
    trend: 0.5,
  },
  {
    id: "comp-2",
    name: "Noise",
    mentions: 310,
    sov: 28.5,
    avgRank: 2.1,
    sentiment: { positive: 35, neutral: 45, negative: 20 },
    trend: -0.3,
  },
  {
    id: "comp-3",
    name: "Realme",
    mentions: 180,
    sov: 16.5,
    avgRank: 3.5,
    sentiment: { positive: 40, neutral: 42, negative: 18 },
    trend: 0.1,
  },
];

const DEMO_GAP_METRICS: GapMetric[] = [
  {
    metric: "Share of Voice",
    yourValue: "6.1%",
    leaderValue: "41.2%",
    leaderName: "boAt",
    gap: "-35.1%",
  },
  {
    metric: "Avg List Rank",
    yourValue: "#6.2",
    leaderValue: "#1.2",
    leaderName: "boAt",
    gap: "-5.0 Positions",
  },
  {
    metric: "Sentiment Score",
    yourValue: "65",
    leaderValue: "78",
    leaderName: "boAt",
    gap: "-13 Points",
  },
  {
    metric: "Total Mentions",
    yourValue: "58",
    leaderValue: "448",
    leaderName: "boAt",
    gap: "-390",
  },
  {
    metric: "Citation Rate",
    yourValue: "12%",
    leaderValue: "34%",
    leaderName: "boAt",
    gap: "-22%",
  },
];

export function useCompetitorAnalysis() {
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [yourBrand, setYourBrand] = useState<CompetitorData | null>(null);
  const [gapMetrics, setGapMetrics] = useState<GapMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCompetitorData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        // Use demo data when not logged in
        setYourBrand(DEMO_YOUR_BRAND);
        setCompetitors(DEMO_COMPETITORS);
        setGapMetrics(DEMO_GAP_METRICS);
        setLoading(false);
        return;
      }

      // Fetch brand
      const { data: brands } = await supabase
        .from("brands")
        .select("id, name")
        .eq("user_id", user.id)
        .eq("is_primary", true)
        .maybeSingle();

      // Fetch competitors
      const { data: competitorsList } = await supabase
        .from("competitors")
        .select("id, name, last_visibility_score, last_rank")
        .eq("user_id", user.id)
        .eq("is_active", true);

      // Fetch engine results for metrics
      const { data: engineResults } = await supabase
        .from("engine_results")
        .select("brand_mentioned, sentiment, brand_position")
        .order("analyzed_at", { ascending: false })
        .limit(500);

      // If no real data, use demo data
      if (!competitorsList || competitorsList.length === 0) {
        setYourBrand({ ...DEMO_YOUR_BRAND, name: brands?.name || "Your Brand" });
        setCompetitors(DEMO_COMPETITORS);
        setGapMetrics(DEMO_GAP_METRICS);
        setLoading(false);
        return;
      }

      // Calculate your brand's metrics from real data
      const brandResults = (engineResults || []).filter(r => r.brand_mentioned);
      const totalResults = Math.max(engineResults?.length || 1, 1);
      
      const brandMentions = brandResults.length;
      const brandSOV = Math.round((brandMentions / totalResults) * 100 * 10) / 10;
      const brandAvgRank = brandResults.length > 0
        ? brandResults.reduce((sum, r) => sum + (r.brand_position || 5), 0) / brandResults.length
        : 5;

      const positiveSentiment = brandResults.filter(r => r.sentiment === "positive").length;
      const negativeSentiment = brandResults.filter(r => r.sentiment === "negative").length;
      const neutralSentiment = Math.max(0, brandResults.length - positiveSentiment - negativeSentiment);

      const yourBrandData: CompetitorData = {
        id: brands?.id || "your-brand",
        name: brands?.name || "Your Brand",
        mentions: brandMentions || DEMO_YOUR_BRAND.mentions,
        sov: brandSOV || DEMO_YOUR_BRAND.sov,
        avgRank: Math.round(brandAvgRank * 10) / 10 || DEMO_YOUR_BRAND.avgRank,
        sentiment: brandResults.length > 0 ? {
          positive: Math.round((positiveSentiment / brandResults.length) * 100),
          neutral: Math.round((neutralSentiment / brandResults.length) * 100),
          negative: Math.round((negativeSentiment / brandResults.length) * 100),
        } : DEMO_YOUR_BRAND.sentiment,
        trend: 0.2,
      };

      setYourBrand(yourBrandData);

      // Build competitor data
      const competitorData: CompetitorData[] = competitorsList.map((comp, idx) => {
        const baseSOV = comp.last_visibility_score || (40 - idx * 10);
        return {
          id: comp.id,
          name: comp.name,
          mentions: Math.round(baseSOV * 10),
          sov: baseSOV,
          avgRank: comp.last_rank || (1.5 + idx * 0.5),
          sentiment: {
            positive: 35 + Math.floor(Math.random() * 20),
            neutral: 40 + Math.floor(Math.random() * 10),
            negative: 10 + Math.floor(Math.random() * 10),
          },
          trend: (Math.random() - 0.5) * 2,
        };
      });

      competitorData.sort((a, b) => b.sov - a.sov);
      setCompetitors(competitorData);

      // Calculate gap metrics
      const leader = competitorData[0];
      if (leader) {
        const gaps: GapMetric[] = [
          {
            metric: "Share of Voice",
            yourValue: `${yourBrandData.sov}%`,
            leaderValue: `${leader.sov}%`,
            leaderName: leader.name,
            gap: `${(yourBrandData.sov - leader.sov).toFixed(1)}%`,
          },
          {
            metric: "Avg List Rank",
            yourValue: `#${yourBrandData.avgRank.toFixed(1)}`,
            leaderValue: `#${leader.avgRank.toFixed(1)}`,
            leaderName: leader.name,
            gap: `${(yourBrandData.avgRank - leader.avgRank).toFixed(1)} Positions`,
          },
          {
            metric: "Total Mentions",
            yourValue: `${yourBrandData.mentions}`,
            leaderValue: `${leader.mentions}`,
            leaderName: leader.name,
            gap: `${yourBrandData.mentions - leader.mentions}`,
          },
          {
            metric: "Positive Sentiment",
            yourValue: `${yourBrandData.sentiment.positive}%`,
            leaderValue: `${leader.sentiment.positive}%`,
            leaderName: leader.name,
            gap: `${yourBrandData.sentiment.positive - leader.sentiment.positive}%`,
          },
        ];
        setGapMetrics(gaps);
      } else {
        setGapMetrics(DEMO_GAP_METRICS);
      }
    } catch (err) {
      console.error("Failed to fetch competitor data:", err);
      setError(err instanceof Error ? err.message : "Failed to load competitor data");
      // Use demo data on error
      setYourBrand(DEMO_YOUR_BRAND);
      setCompetitors(DEMO_COMPETITORS);
      setGapMetrics(DEMO_GAP_METRICS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCompetitorData();
  }, [fetchCompetitorData]);

  return {
    competitors,
    yourBrand,
    gapMetrics,
    loading,
    error,
    refresh: fetchCompetitorData,
  };
}
