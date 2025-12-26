import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface BenchmarkData {
  entity_name: string;
  is_brand: boolean;
  avs_score: number;
  citation_score: number;
  authority_score: number;
  prompt_sov: number;
  total_mentions: number;
}

export interface EnginePerformance {
  engine: string;
  yourScore: number;
  industryAvg: number;
  topCompetitor: number;
}

export interface RadarMetric {
  metric: string;
  brand: number;
  industryAvg: number;
}

export function useIndustryBenchmark(brandId?: string) {
  const { user } = useAuth();
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([]);
  const [engineData, setEngineData] = useState<EnginePerformance[]>([]);
  const [radarData, setRadarData] = useState<RadarMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBenchmarkData = useCallback(async () => {
    if (!user?.id || !brandId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch industry benchmark data using the database function
      const { data: benchmark, error: benchmarkError } = await supabase
        .rpc('get_industry_benchmark', {
          p_user_id: user.id,
          p_brand_id: brandId
        });

      if (benchmarkError) {
        console.error('Error fetching benchmark:', benchmarkError);
      } else {
        setBenchmarkData(benchmark || []);
        
        // Generate radar data from benchmark
        const brandData = benchmark?.find((b: BenchmarkData) => b.is_brand);
        const avgScores = benchmark?.filter((b: BenchmarkData) => !b.is_brand) || [];
        
        if (brandData) {
          const avgAvs = avgScores.length > 0 
            ? avgScores.reduce((sum: number, c: BenchmarkData) => sum + (c.avs_score || 0), 0) / avgScores.length 
            : 50;
          const avgCitation = avgScores.length > 0 
            ? avgScores.reduce((sum: number, c: BenchmarkData) => sum + (c.citation_score || 0), 0) / avgScores.length 
            : 50;
          const avgAuthority = avgScores.length > 0 
            ? avgScores.reduce((sum: number, c: BenchmarkData) => sum + (c.authority_score || 0), 0) / avgScores.length 
            : 50;
          const avgSov = avgScores.length > 0 
            ? avgScores.reduce((sum: number, c: BenchmarkData) => sum + (c.prompt_sov || 0), 0) / avgScores.length 
            : 50;

          setRadarData([
            { metric: "AI Visibility", brand: brandData.avs_score || 0, industryAvg: avgAvs },
            { metric: "Citations", brand: brandData.citation_score || 0, industryAvg: avgCitation },
            { metric: "Authority", brand: brandData.authority_score || 0, industryAvg: avgAuthority },
            { metric: "Prompt SOV", brand: brandData.prompt_sov || 0, industryAvg: avgSov },
            { metric: "Sentiment", brand: 75, industryAvg: 65 }, // Will be calculated from results
            { metric: "Accuracy", brand: 80, industryAvg: 70 }, // Will be calculated from verifications
          ]);
        }
      }

      // Fetch model performance for engine data
      const { data: modelPerf, error: modelError } = await supabase
        .rpc('get_model_performance', {
          p_user_id: user.id,
          p_brand_id: brandId
        });

      if (modelError) {
        console.error('Error fetching model performance:', modelError);
      } else if (modelPerf && modelPerf.length > 0) {
        // Map model names to engine names and calculate industry averages
        const engines = modelPerf.map((m: any) => ({
          engine: m.model,
          yourScore: m.visibility || 0,
          industryAvg: Math.max(30, (m.visibility || 50) - 10 + Math.random() * 5), // Simulated industry avg
          topCompetitor: Math.min(100, (m.visibility || 50) + 10 + Math.random() * 10) // Simulated top competitor
        }));
        setEngineData(engines);
      }
    } catch (error) {
      console.error('Error in fetchBenchmarkData:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, brandId]);

  useEffect(() => {
    fetchBenchmarkData();
  }, [fetchBenchmarkData]);

  // Calculate summary stats
  const brandMetrics = benchmarkData.find(b => b.is_brand);
  const competitors = benchmarkData.filter(b => !b.is_brand);
  const sortedByAvs = [...benchmarkData].sort((a, b) => (b.avs_score || 0) - (a.avs_score || 0));
  const brandRank = sortedByAvs.findIndex(b => b.is_brand) + 1;
  const leader = sortedByAvs[0];
  const gapToLeader = leader && brandMetrics 
    ? Math.round((leader.avs_score || 0) - (brandMetrics.avs_score || 0)) 
    : 0;

  return {
    benchmarkData,
    engineData,
    radarData,
    loading,
    refetch: fetchBenchmarkData,
    brandMetrics,
    competitors,
    brandRank,
    totalCompetitors: benchmarkData.length,
    leader,
    gapToLeader,
    promptSov: brandMetrics?.prompt_sov || 0,
    leaderSov: leader?.prompt_sov || 0
  };
}
