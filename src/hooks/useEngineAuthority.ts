import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface EngineAuthority {
  engine: string;
  display_name: string;
  reliability_score: number;
  citation_completeness: number;
  freshness_index: number;
  response_consistency: number;
  authority_weight: number;
  status: "healthy" | "degraded" | "unavailable" | "maintenance";
  status_message?: string;
  consecutive_failures: number;
  last_successful_query?: string;
  total_queries: number;
  successful_queries: number;
  avg_response_time_ms: number;
}

export interface EngineOutage {
  id: string;
  engine: string;
  display_name: string;
  started_at: string;
  ended_at?: string;
  affected_queries: number;
  resolution_type?: string;
}

export interface EngineTrend {
  engine: string;
  currentScore: number;
  previousScore: number;
  delta: number;
  trend: "up" | "down" | "stable";
  dataPoints: number;
}

export interface WeightedAVSResult {
  weightedAVS: number;
  unweightedAVS: number;
  engineBreakdown: Array<{
    engine: string;
    displayName: string;
    rawScore: number;
    authorityWeight: number;
    weightedScore: number;
    status: string;
  }>;
  lowAuthorityImpact?: string;
  degradedEngines: string[];
  confidenceLevel: "high" | "medium" | "low";
  isEstimated: boolean;
}

export function useEngineAuthority() {
  const [engines, setEngines] = useState<EngineAuthority[]>([]);
  const [outages, setOutages] = useState<EngineOutage[]>([]);
  const [engineTrends, setEngineTrends] = useState<Map<string, EngineTrend>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchEngineAuthority = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from("engine_authority")
        .select("*")
        .order("authority_weight", { ascending: false });
      
      if (fetchError) throw fetchError;
      setEngines((data as EngineAuthority[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch engine authority");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActiveOutages = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from("engine_outages")
        .select(`
          *,
          engine_authority!inner(display_name)
        `)
        .is("ended_at", null);
      
      if (fetchError) throw fetchError;
      
      setOutages((data || []).map((o: any) => ({
        ...o,
        display_name: o.engine_authority?.display_name || o.engine,
      })));
    } catch (err) {
      console.error("Failed to fetch outages:", err);
    }
  }, []);

  // Fetch per-engine trends from snapshots (7-day rolling comparison)
  const fetchEngineTrends = useCallback(async () => {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

      // Get recent snapshots (last 3 days)
      const { data: recentSnapshots } = await supabase
        .from("engine_snapshots")
        .select("engine, reliability_score, created_at")
        .gte("created_at", threeDaysAgo)
        .order("created_at", { ascending: false });

      // Get older snapshots (3-7 days ago)
      const { data: olderSnapshots } = await supabase
        .from("engine_snapshots")
        .select("engine, reliability_score, created_at")
        .gte("created_at", sevenDaysAgo)
        .lt("created_at", threeDaysAgo)
        .order("created_at", { ascending: false });

      const trends = new Map<string, EngineTrend>();

      // Group by engine and calculate averages
      const recentByEngine = new Map<string, number[]>();
      const olderByEngine = new Map<string, number[]>();

      for (const snap of recentSnapshots || []) {
        if (!recentByEngine.has(snap.engine)) {
          recentByEngine.set(snap.engine, []);
        }
        recentByEngine.get(snap.engine)!.push(snap.reliability_score);
      }

      for (const snap of olderSnapshots || []) {
        if (!olderByEngine.has(snap.engine)) {
          olderByEngine.set(snap.engine, []);
        }
        olderByEngine.get(snap.engine)!.push(snap.reliability_score);
      }

      // Calculate trends for each engine
      for (const [engine, recentScores] of recentByEngine) {
        const olderScores = olderByEngine.get(engine) || [];
        
        if (recentScores.length > 0) {
          const currentScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
          const previousScore = olderScores.length > 0
            ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length
            : currentScore;
          
          const delta = Number((currentScore - previousScore).toFixed(1));
          const trend = delta > 1 ? "up" : delta < -1 ? "down" : "stable";

          trends.set(engine, {
            engine,
            currentScore: Math.round(currentScore),
            previousScore: Math.round(previousScore),
            delta,
            trend,
            dataPoints: recentScores.length + olderScores.length,
          });
        }
      }

      setEngineTrends(trends);
    } catch (err) {
      console.error("Failed to fetch engine trends:", err);
    }
  }, []);

  // Get trend for a specific engine
  const getEngineTrend = useCallback((engine: string): EngineTrend | null => {
    return engineTrends.get(engine) || null;
  }, [engineTrends]);

  const calculateWeightedAVS = useCallback(async (
    engineResults: Array<{ engine: string; score: number }>
  ): Promise<WeightedAVSResult | null> => {
    try {
      const { data, error: funcError } = await supabase.functions.invoke("engine-authority", {
        body: {
          action: "calculateWeightedAVS",
          engineResults,
        },
      });
      
      if (funcError) throw funcError;
      return data as WeightedAVSResult;
    } catch (err) {
      console.error("Failed to calculate weighted AVS:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchEngineAuthority();
    fetchActiveOutages();
    fetchEngineTrends();
    
    // Subscribe to engine authority changes
    const channel = supabase
      .channel("engine_authority_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "engine_authority" },
        () => {
          fetchEngineAuthority();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "engine_outages" },
        () => {
          fetchActiveOutages();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEngineAuthority, fetchActiveOutages, fetchEngineTrends]);

  // Computed values
  const healthyEngines = engines.filter(e => e.status === "healthy");
  const degradedEngines = engines.filter(e => e.status === "degraded");
  const unavailableEngines = engines.filter(e => e.status === "unavailable");
  const hasActiveOutages = outages.length > 0;
  
  const overallHealth = engines.length > 0
    ? Math.round(healthyEngines.length / engines.length * 100)
    : 100;

  return {
    engines,
    outages,
    engineTrends,
    loading,
    error,
    healthyEngines,
    degradedEngines,
    unavailableEngines,
    hasActiveOutages,
    overallHealth,
    fetchEngineAuthority,
    fetchActiveOutages,
    fetchEngineTrends,
    calculateWeightedAVS,
    getEngineTrend,
  };
}
