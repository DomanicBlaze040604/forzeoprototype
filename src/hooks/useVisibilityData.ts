import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface EnginePerformance {
  engine: string;
  displayName: string;
  visibility: number | null;
  citations: number;
  trend: number | null;
  authorityWeight: number;
  status: "healthy" | "degraded" | "unavailable";
}

interface TrendDataPoint {
  date: string;
  visibility: number;
  citations: number;
}

interface PromptPerformance {
  id: string;
  prompt: string;
  visibility: number | null;
  enginesCount: number;
  totalEngines: number;
  citations: number;
  status: "verified" | "partial" | "hallucinated" | "pending";
}

interface Metrics {
  aiVisibilityScore: number | null;
  citationScore: number | null;
  authorityScore: number | null;
  shareOfVoice: number | null;
  scoreDelta: number | null;
  citationDelta: number | null;
  authorityDelta: number | null;
  sovDelta: number | null;
  dataAvailable: boolean;
  lastUpdated: string | null;
  isEstimated: boolean;
  confidenceLevel: "high" | "medium" | "low";
}

const ENGINE_DISPLAY_NAMES: Record<string, string> = {
  google_ai_mode: "Google AI Mode",
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  bing_copilot: "Bing Copilot",
  gemini: "Gemini",
  claude: "Claude",
};

export function useVisibilityData(brandId?: string) {
  const [metrics, setMetrics] = useState<Metrics>({
    aiVisibilityScore: null,
    citationScore: null,
    authorityScore: null,
    shareOfVoice: null,
    scoreDelta: null,
    citationDelta: null,
    authorityDelta: null,
    sovDelta: null,
    dataAvailable: false,
    lastUpdated: null,
    isEstimated: false,
    confidenceLevel: "high",
  });
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [enginePerformance, setEnginePerformance] = useState<EnginePerformance[]>([]);
  const [promptPerformance, setPromptPerformance] = useState<PromptPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchTrendData = useCallback(async (days: number = 7) => {
    if (!user) return;

    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: scores } = await supabase
        .from("prompt_scores")
        .select("ai_visibility_score, citation_score, scored_at")
        .gte("scored_at", startDate)
        .order("scored_at", { ascending: true });

      if (!scores || scores.length === 0) {
        setTrendData([]);
        return;
      }

      // Group by day
      const trendMap = new Map<string, { visibility: number[]; citations: number[] }>();
      for (const score of scores) {
        const date = score.scored_at.split("T")[0];
        if (!trendMap.has(date)) {
          trendMap.set(date, { visibility: [], citations: [] });
        }
        trendMap.get(date)!.visibility.push(score.ai_visibility_score);
        trendMap.get(date)!.citations.push(score.citation_score);
      }

      const trend: TrendDataPoint[] = Array.from(trendMap.entries())
        .map(([date, values]) => ({
          date,
          visibility: Math.round(values.visibility.reduce((a, b) => a + b, 0) / values.visibility.length),
          citations: Math.round(values.citations.reduce((a, b) => a + b, 0) / values.citations.length),
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setTrendData(trend);
    } catch (err) {
      console.error("Failed to fetch trend data:", err);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch latest prompt scores with prompt text
      const { data: scores, error: scoresError } = await supabase
        .from("prompt_scores")
        .select(`
          id,
          prompt_id,
          ai_visibility_score,
          citation_score,
          brand_authority_score,
          share_of_voice,
          breakdown,
          confidence,
          scored_at
        `)
        .order("scored_at", { ascending: false })
        .limit(100);

      if (scoresError) throw scoresError;

      // Fetch prompts separately
      const promptIds = [...new Set((scores || []).map(s => s.prompt_id))];
      const { data: prompts } = await supabase
        .from("prompts")
        .select("id, text")
        .in("id", promptIds);

      const promptMap = new Map((prompts || []).map(p => [p.id, p.text]));

      // Fetch engine authority data
      const { data: engines, error: enginesError } = await supabase
        .from("engine_authority")
        .select("*");

      if (enginesError) throw enginesError;

      // Fetch engine results for metrics
      const { data: engineResults } = await supabase
        .from("engine_results")
        .select("engine, brand_mentioned, citations")
        .order("analyzed_at", { ascending: false })
        .limit(500);

      // Calculate aggregate scores
      const validScores = (scores || []).filter(s => s.ai_visibility_score > 0);
      const hasData = validScores.length > 0;

      const avgVisibility = hasData
        ? Math.round(validScores.reduce((sum, s) => sum + s.ai_visibility_score, 0) / validScores.length)
        : null;
      const avgCitation = hasData
        ? Math.round(validScores.reduce((sum, s) => sum + s.citation_score, 0) / validScores.length)
        : null;
      const avgAuthority = hasData
        ? Math.round(validScores.reduce((sum, s) => sum + s.brand_authority_score, 0) / validScores.length)
        : null;
      const avgSOV = hasData
        ? validScores.reduce((sum, s) => sum + (s.share_of_voice || 0), 0) / validScores.length
        : null;

      // Calculate deltas (compare recent vs older)
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const recentScores = validScores.filter(s => s.scored_at > weekAgo);
      const olderScores = validScores.filter(s => s.scored_at <= weekAgo);

      let scoreDelta: number | null = null;
      let citationDelta: number | null = null;
      let authorityDelta: number | null = null;
      let sovDelta: number | null = null;

      if (recentScores.length > 0 && olderScores.length > 0) {
        // AVS delta
        const recentAvg = recentScores.reduce((sum, s) => sum + s.ai_visibility_score, 0) / recentScores.length;
        const olderAvg = olderScores.reduce((sum, s) => sum + s.ai_visibility_score, 0) / olderScores.length;
        scoreDelta = Number((recentAvg - olderAvg).toFixed(1));

        // Citation delta
        const recentCitationAvg = recentScores.reduce((sum, s) => sum + s.citation_score, 0) / recentScores.length;
        const olderCitationAvg = olderScores.reduce((sum, s) => sum + s.citation_score, 0) / olderScores.length;
        citationDelta = Number((recentCitationAvg - olderCitationAvg).toFixed(1));

        // Authority delta
        const recentAuthorityAvg = recentScores.reduce((sum, s) => sum + s.brand_authority_score, 0) / recentScores.length;
        const olderAuthorityAvg = olderScores.reduce((sum, s) => sum + s.brand_authority_score, 0) / olderScores.length;
        authorityDelta = Number((recentAuthorityAvg - olderAuthorityAvg).toFixed(1));

        // SOV delta
        const recentSOVAvg = recentScores.reduce((sum, s) => sum + (s.share_of_voice || 0), 0) / recentScores.length;
        const olderSOVAvg = olderScores.reduce((sum, s) => sum + (s.share_of_voice || 0), 0) / olderScores.length;
        sovDelta = Number((recentSOVAvg - olderSOVAvg).toFixed(1));
      }

      const lastUpdated = validScores.length > 0 ? validScores[0].scored_at : null;

      // Check for degraded engines
      const degradedEngines = (engines || [])
        .filter(e => e.status === "degraded" || e.status === "unavailable")
        .map(e => e.display_name || e.engine);

      const isEstimated = degradedEngines.length > 0;
      const confidenceLevel: "high" | "medium" | "low" = degradedEngines.length === 0 ? "high" 
        : degradedEngines.length <= 2 ? "medium" : "low";

      setMetrics({
        aiVisibilityScore: avgVisibility,
        citationScore: avgCitation,
        authorityScore: avgAuthority,
        shareOfVoice: avgSOV,
        scoreDelta,
        citationDelta,
        authorityDelta,
        sovDelta,
        dataAvailable: hasData,
        lastUpdated,
        isEstimated,
        confidenceLevel,
      });

      // Fetch engine snapshots for trend calculation (7-day comparison)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

      const { data: recentSnapshots } = await supabase
        .from("engine_snapshots")
        .select("engine, reliability_score")
        .gte("created_at", threeDaysAgo);

      const { data: olderSnapshots } = await supabase
        .from("engine_snapshots")
        .select("engine, reliability_score")
        .gte("created_at", sevenDaysAgo)
        .lt("created_at", threeDaysAgo);

      // Calculate per-engine trends
      const engineTrends = new Map<string, number>();
      const recentByEngine = new Map<string, number[]>();
      const olderByEngine = new Map<string, number[]>();

      for (const snap of recentSnapshots || []) {
        if (!recentByEngine.has(snap.engine)) recentByEngine.set(snap.engine, []);
        recentByEngine.get(snap.engine)!.push(snap.reliability_score);
      }
      for (const snap of olderSnapshots || []) {
        if (!olderByEngine.has(snap.engine)) olderByEngine.set(snap.engine, []);
        olderByEngine.get(snap.engine)!.push(snap.reliability_score);
      }

      for (const [engine, recentScoresArr] of recentByEngine) {
        const olderScoresArr = olderByEngine.get(engine) || [];
        if (recentScoresArr.length > 0 && olderScoresArr.length > 0) {
          const recentAvg = recentScoresArr.reduce((a, b) => a + b, 0) / recentScoresArr.length;
          const olderAvg = olderScoresArr.reduce((a, b) => a + b, 0) / olderScoresArr.length;
          engineTrends.set(engine, Number((recentAvg - olderAvg).toFixed(1)));
        }
      }

      // Build engine performance from real data with trends
      const enginePerfData: EnginePerformance[] = (engines || []).map(e => {
        const engineData = (engineResults || []).filter(r => r.engine === e.engine);
        const mentionedCount = engineData.filter(r => r.brand_mentioned).length;
        const visibility = engineData.length > 0
          ? Math.round((mentionedCount / engineData.length) * 100)
          : null;
        const citations = engineData.reduce((sum, r) => {
          const citationArray = r.citations as unknown[] || [];
          return sum + citationArray.length;
        }, 0);

        // Get trend from snapshots
        const trend = engineTrends.get(e.engine) ?? null;

        return {
          engine: e.engine,
          displayName: ENGINE_DISPLAY_NAMES[e.engine] || e.display_name || e.engine,
          visibility,
          citations,
          trend,
          authorityWeight: e.authority_weight,
          status: e.status as "healthy" | "degraded" | "unavailable",
        };
      });

      setEnginePerformance(enginePerfData);

      // Build prompt performance
      const promptPerfData: PromptPerformance[] = validScores.slice(0, 10).map(s => {
        const breakdown = s.breakdown as unknown[] || [];
        return {
          id: s.prompt_id,
          prompt: promptMap.get(s.prompt_id) || "Unknown prompt",
          visibility: s.ai_visibility_score,
          enginesCount: breakdown.length,
          totalEngines: 6,
          citations: Math.round(s.citation_score / 10),
          status: s.confidence >= 80 ? "verified" 
            : s.confidence >= 50 ? "partial" 
            : s.confidence > 0 ? "hallucinated" 
            : "pending",
        };
      });

      setPromptPerformance(promptPerfData);

      // Fetch trend data
      await fetchTrendData(7);

    } catch (err) {
      console.error("Failed to fetch visibility data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [user, brandId, fetchTrendData]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    metrics,
    trendData,
    enginePerformance,
    promptPerformance,
    loading,
    error,
    refresh,
    fetchTrendData,
  };
}
