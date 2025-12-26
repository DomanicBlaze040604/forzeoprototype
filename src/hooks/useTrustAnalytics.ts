import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TrustTrend {
  engine: string;
  displayName: string;
  trendType: string;
  authorityChange: number;
  authorityTrend: "improving" | "stable" | "declining";
  reliabilityChange: number;
  volatility: number;
  outageCount: number;
  totalOutageMinutes: number;
  currentAuthority: number;
  prediction30d?: number;
}

export interface HistoricalSnapshot {
  date: string;
  reliabilityScore: number;
  citationCompleteness: number;
  freshnessIndex: number;
  authorityWeight: number;
  totalQueries: number;
  successRate: number;
}

export interface EngineCorrelation {
  engineA: string;
  engineB: string;
  authorityCorrelation: number;
  disagreementFrequency: number;
  engineAWinRate: number;
  engineBWinRate: number;
}

export interface TrustSummary {
  totalEngines: number;
  healthyEngines: number;
  degradedEngines: number;
  unavailableEngines: number;
  activeOutages: number;
  avgAuthority: number;
  enginesImproving: number;
  enginesDeclining: number;
  enginesStable: number;
  engines: Array<{
    engine: string;
    displayName: string;
    status: string;
    authorityWeight: number;
    reliabilityScore: number;
    trend30d: string;
    authorityChange30d: number;
    outages30d: number;
  }>;
}

export function useTrustAnalytics() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<TrustSummary | null>(null);
  const [executiveStatement, setExecutiveStatement] = useState<string>("");
  const [trends, setTrends] = useState<TrustTrend[]>([]);
  const [correlations, setCorrelations] = useState<EngineCorrelation[]>([]);

  const fetchTrustSummary = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("trust-analytics", {
        body: { action: "getTrustSummary" },
      });
      
      if (error) throw error;
      
      setSummary(data.summary);
      setExecutiveStatement(data.executiveStatement);
    } catch (err) {
      console.error("Failed to fetch trust summary:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrustTrends = useCallback(async (
    engine?: string,
    trendType: string = "30d"
  ): Promise<TrustTrend[]> => {
    try {
      const { data, error } = await supabase.functions.invoke("trust-analytics", {
        body: { action: "getTrustTrends", engine, trendType },
      });
      
      if (error) throw error;
      
      setTrends(data.trends || []);
      return data.trends || [];
    } catch (err) {
      console.error("Failed to fetch trust trends:", err);
      return [];
    }
  }, []);

  const fetchHistoricalSnapshots = useCallback(async (
    engine: string,
    days: number = 30
  ): Promise<HistoricalSnapshot[]> => {
    try {
      const { data, error } = await supabase.functions.invoke("trust-analytics", {
        body: { action: "getHistoricalSnapshots", engine, days },
      });
      
      if (error) throw error;
      return data.snapshots || [];
    } catch (err) {
      console.error("Failed to fetch historical snapshots:", err);
      return [];
    }
  }, []);

  const fetchEngineCorrelations = useCallback(async (
    period: string = "30d"
  ): Promise<EngineCorrelation[]> => {
    try {
      const { data, error } = await supabase.functions.invoke("trust-analytics", {
        body: { action: "getEngineCorrelations", period },
      });
      
      if (error) throw error;
      
      setCorrelations(data.correlations || []);
      return data.correlations || [];
    } catch (err) {
      console.error("Failed to fetch correlations:", err);
      return [];
    }
  }, []);

  const generateDailySnapshot = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("trust-analytics", {
        body: { action: "generateDailySnapshot" },
      });
      
      if (error) throw error;
      return data.success;
    } catch (err) {
      console.error("Failed to generate snapshot:", err);
      return false;
    }
  }, []);

  const calculateTrustTrends = useCallback(async (
    engine: string,
    trendTypes: string[] = ["7d", "30d", "90d"]
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("trust-analytics", {
        body: { action: "calculateTrustTrends", engine, trendTypes },
      });
      
      if (error) throw error;
      return data.results?.every((r: any) => r.success) || false;
    } catch (err) {
      console.error("Failed to calculate trends:", err);
      return false;
    }
  }, []);

  const calculateCorrelations = useCallback(async (
    period: string = "30d"
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("trust-analytics", {
        body: { action: "calculateCorrelations", period },
      });
      
      if (error) throw error;
      return data.calculated > 0;
    } catch (err) {
      console.error("Failed to calculate correlations:", err);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchTrustSummary();
  }, [fetchTrustSummary]);

  return {
    loading,
    summary,
    executiveStatement,
    trends,
    correlations,
    fetchTrustSummary,
    fetchTrustTrends,
    fetchHistoricalSnapshots,
    fetchEngineCorrelations,
    generateDailySnapshot,
    calculateTrustTrends,
    calculateCorrelations,
  };
}
