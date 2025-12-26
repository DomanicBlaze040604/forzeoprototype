// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScoringConfig {
  version: string;
  weights: {
    visibility: number;
    citations: number;
    sentiment: number;
    rank: number;
  };
  algorithm: {
    mentionWeight: number;
    rankDecay: number;
    sentimentMultiplier: {
      positive: number;
      neutral: number;
      negative: number;
    };
    citationBonus: number;
    competitorPenalty: number;
  };
}

interface EngineResult {
  engine: string;
  mentioned: boolean;
  position?: number;
  citationCount: number;
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  competitorsMentioned: number;
}

interface ScoreResult {
  aiVisibilityScore: number;
  citationScore: number;
  brandAuthorityScore: number;
  promptShareOfVoice: number;
  breakdown: {
    engine: string;
    score: number;
    factors: Record<string, number>;
  }[];
  confidence: number;
  scoringVersion: string;
}

// Default scoring configuration
const DEFAULT_CONFIG: ScoringConfig = {
  version: "v1.0.0",
  weights: {
    visibility: 0.4,
    citations: 0.3,
    sentiment: 0.2,
    rank: 0.1,
  },
  algorithm: {
    mentionWeight: 1.0,
    rankDecay: 0.1,
    sentimentMultiplier: {
      positive: 1.2,
      neutral: 1.0,
      negative: 0.8,
    },
    citationBonus: 0.15,
    competitorPenalty: 0.05,
  },
};

// Calculate visibility score for a single engine
function calculateEngineVisibility(
  result: EngineResult,
  config: ScoringConfig
): { score: number; factors: Record<string, number> } {
  const factors: Record<string, number> = {};
  
  // Base mention score
  factors.mention = result.mentioned ? 100 * config.algorithm.mentionWeight : 0;
  
  // Position bonus (higher position = better)
  if (result.position !== undefined && result.position > 0) {
    factors.position = Math.max(0, 100 - (result.position - 1) * config.algorithm.rankDecay * 100);
  } else {
    factors.position = result.mentioned ? 50 : 0;
  }
  
  // Citation bonus
  factors.citations = Math.min(100, result.citationCount * config.algorithm.citationBonus * 100);
  
  // Sentiment multiplier
  const sentimentMult = config.algorithm.sentimentMultiplier[result.sentiment];
  factors.sentiment = result.sentimentScore * sentimentMult * 50 + 50;
  
  // Competitor penalty
  factors.competitorPenalty = -result.competitorsMentioned * config.algorithm.competitorPenalty * 100;
  
  // Calculate weighted score
  const score = Math.max(0, Math.min(100,
    factors.mention * config.weights.visibility +
    factors.position * config.weights.rank +
    factors.citations * config.weights.citations +
    factors.sentiment * config.weights.sentiment +
    factors.competitorPenalty
  ));
  
  return { score, factors };
}

// Calculate AI Visibility Score (AVS) across all engines
function calculateAVS(
  engineResults: EngineResult[],
  config: ScoringConfig
): { score: number; breakdown: ScoreResult["breakdown"] } {
  if (engineResults.length === 0) {
    return { score: 0, breakdown: [] };
  }
  
  const breakdown: ScoreResult["breakdown"] = [];
  let totalScore = 0;
  
  for (const result of engineResults) {
    const { score, factors } = calculateEngineVisibility(result, config);
    breakdown.push({
      engine: result.engine,
      score,
      factors,
    });
    totalScore += score;
  }
  
  return {
    score: Math.round(totalScore / engineResults.length),
    breakdown,
  };
}

// Calculate Citation Score
function calculateCitationScore(
  engineResults: EngineResult[],
  totalCitations: number,
  brandCitations: number
): number {
  if (totalCitations === 0) return 0;
  
  const citationRatio = brandCitations / totalCitations;
  const avgCitations = engineResults.reduce((sum, r) => sum + r.citationCount, 0) / engineResults.length;
  
  return Math.round(Math.min(100, citationRatio * 50 + avgCitations * 10));
}

// Calculate Brand Authority Score
function calculateBrandAuthority(
  avs: number,
  citationScore: number,
  historicalTrend: number = 0
): number {
  // Weighted combination with historical trend bonus
  const baseScore = avs * 0.5 + citationScore * 0.3;
  const trendBonus = historicalTrend * 0.2;
  
  return Math.round(Math.min(100, baseScore + trendBonus));
}

// Calculate Prompt Share of Voice
function calculateShareOfVoice(
  brandMentions: number,
  competitorMentions: number
): number {
  const total = brandMentions + competitorMentions;
  if (total === 0) return 0;
  
  return Math.round((brandMentions / total) * 100);
}

// Get scoring config from database or use default
async function getScoringConfig(supabase: any, version?: string): Promise<ScoringConfig> {
  try {
    let query = supabase
      .from("scoring_versions")
      .select("*");
    
    if (version) {
      query = query.eq("version", version);
    } else {
      query = query.eq("is_active", true);
    }
    
    const { data, error } = await query.single();
    
    if (error || !data) {
      return DEFAULT_CONFIG;
    }
    
    return {
      version: data.version,
      weights: data.weights,
      algorithm: data.algorithm_config,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

// Store score in database with degraded mode support
async function storeScore(
  supabase: any,
  promptId: string,
  score: ScoreResult,
  degradedEngines: string[] = [],
  isEstimated: boolean = false
): Promise<void> {
  try {
    const scoreData: any = {
      prompt_id: promptId,
      ai_visibility_score: score.aiVisibilityScore,
      citation_score: score.citationScore,
      brand_authority_score: score.brandAuthorityScore,
      share_of_voice: score.promptShareOfVoice,
      breakdown: score.breakdown,
      scoring_version: score.scoringVersion,
      confidence: score.confidence,
      scored_at: new Date().toISOString(),
      is_estimated: isEstimated,
      degraded_engines: degradedEngines,
    };
    
    // If this is a full confidence score, store it for fallback
    if (!isEstimated && degradedEngines.length === 0) {
      scoreData.last_full_confidence_score = score.aiVisibilityScore;
      scoreData.last_full_confidence_at = new Date().toISOString();
    } else {
      scoreData.confidence_downgrade_reason = 
        `Estimated due to: ${degradedEngines.join(", ")} unavailable`;
    }
    
    await supabase
      .from("prompt_scores")
      .upsert(scoreData);
  } catch (error) {
    console.error("Failed to store score:", error);
  }
}

// Get engine authority data
async function getEngineAuthority(supabase: any): Promise<Map<string, any>> {
  try {
    const { data } = await supabase
      .from("engine_authority")
      .select("*");
    
    return new Map((data || []).map((e: any) => [e.engine, e]));
  } catch {
    return new Map();
  }
}

// Update engine authority after query
async function updateEngineAuthority(
  supabase: any,
  engine: string,
  success: boolean,
  responseTimeMs?: number
): Promise<void> {
  try {
    const { data: current } = await supabase
      .from("engine_authority")
      .select("*")
      .eq("engine", engine)
      .single();
    
    if (!current) return;
    
    const newTotalQueries = current.total_queries + 1;
    const newSuccessfulQueries = success ? current.successful_queries + 1 : current.successful_queries;
    const newConsecutiveFailures = success ? 0 : current.consecutive_failures + 1;
    
    const newReliability = newTotalQueries > 10
      ? Math.min(100, Math.max(0, (newSuccessfulQueries / newTotalQueries) * 100))
      : current.reliability_score;
    
    let newStatus = "healthy";
    if (newConsecutiveFailures >= 5) newStatus = "unavailable";
    else if (newConsecutiveFailures >= 3) newStatus = "degraded";
    
    let newWeight = 0.8 + 
      (newReliability / 100) * 0.4 + 
      (current.citation_completeness / 100) * 0.2 + 
      (current.freshness_index / 100) * 0.1;
    
    if (newConsecutiveFailures >= 5) newWeight = 0.5;
    else if (newConsecutiveFailures >= 3) newWeight = 0.75;
    newWeight = Math.min(1.5, newWeight);
    
    await supabase
      .from("engine_authority")
      .update({
        total_queries: newTotalQueries,
        successful_queries: newSuccessfulQueries,
        consecutive_failures: newConsecutiveFailures,
        reliability_score: newReliability,
        status: newStatus,
        authority_weight: newWeight,
        last_successful_query: success ? new Date().toISOString() : current.last_successful_query,
        last_failure: success ? current.last_failure : new Date().toISOString(),
        avg_response_time_ms: responseTimeMs
          ? Math.round((current.avg_response_time_ms * current.total_queries + responseTimeMs) / newTotalQueries)
          : current.avg_response_time_ms,
        updated_at: new Date().toISOString(),
      })
      .eq("engine", engine);
  } catch (error) {
    console.error("Failed to update engine authority:", error);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      promptId,
      engineResults,
      totalCitations = 0,
      brandCitations = 0,
      competitorMentions = 0,
      historicalTrend = 0,
      scoringVersion,
      storeResult = true,
      useAuthorityWeighting = true,
    } = await req.json();

    if (!engineResults || !Array.isArray(engineResults)) {
      return new Response(
        JSON.stringify({ error: "engineResults array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Scoring ${engineResults.length} engine results`);

    // Get scoring configuration
    const config = await getScoringConfig(supabase, scoringVersion);
    
    // Get engine authority for weighted scoring
    const engineAuthority = await getEngineAuthority(supabase);
    const degradedEngines: string[] = [];
    let isEstimated = false;
    
    // Apply authority weighting if enabled
    let weightedEngineResults = engineResults;
    if (useAuthorityWeighting && engineAuthority.size > 0) {
      weightedEngineResults = engineResults.map(result => {
        const authority = engineAuthority.get(result.engine);
        if (authority) {
          // Track degraded/unavailable engines
          if (authority.status === "unavailable") {
            degradedEngines.push(result.engine);
            isEstimated = true;
          } else if (authority.status === "degraded") {
            degradedEngines.push(result.engine);
          }
          
          return {
            ...result,
            authorityWeight: authority.authority_weight,
            status: authority.status,
          };
        }
        return result;
      });
    }
    
    // Calculate all scores (now with authority weighting)
    const { score: avs, breakdown } = calculateAVS(weightedEngineResults, config);
    
    // Calculate weighted AVS if authority data available
    let weightedAVS = avs;
    if (useAuthorityWeighting && engineAuthority.size > 0) {
      let totalWeighted = 0;
      let totalWeight = 0;
      
      for (const result of weightedEngineResults) {
        const weight = result.authorityWeight || 1.0;
        const engineBreakdown = breakdown.find(b => b.engine === result.engine);
        if (engineBreakdown) {
          totalWeighted += engineBreakdown.score * weight;
          totalWeight += weight;
        }
      }
      
      weightedAVS = totalWeight > 0 ? Math.round(totalWeighted / totalWeight) : avs;
    }
    
    const citationScore = calculateCitationScore(engineResults, totalCitations, brandCitations);
    const brandAuthority = calculateBrandAuthority(weightedAVS, citationScore, historicalTrend);
    
    const brandMentions = engineResults.filter(r => r.mentioned).length;
    const shareOfVoice = calculateShareOfVoice(brandMentions, competitorMentions);
    
    // Calculate confidence based on data completeness and engine health
    const dataPoints = engineResults.length;
    const mentionedEngines = engineResults.filter(r => r.mentioned).length;
    const healthyEngines = weightedEngineResults.filter(r => r.status !== "unavailable" && r.status !== "degraded").length;
    
    let confidence = Math.min(100, 50 + dataPoints * 10 + mentionedEngines * 5);
    // Reduce confidence for degraded engines
    if (degradedEngines.length > 0) {
      confidence = Math.round(confidence * (healthyEngines / dataPoints));
    }
    
    const result: ScoreResult = {
      aiVisibilityScore: weightedAVS,
      citationScore,
      brandAuthorityScore: brandAuthority,
      promptShareOfVoice: shareOfVoice,
      breakdown,
      confidence,
      scoringVersion: config.version,
    };
    
    // Store result if requested
    if (storeResult && promptId) {
      await storeScore(supabase, promptId, result, degradedEngines, isEstimated);
    }
    
    // Update engine authority for each result
    for (const engineResult of engineResults) {
      await updateEngineAuthority(
        supabase,
        engineResult.engine,
        engineResult.mentioned !== undefined,
        engineResult.responseTimeMs
      );
    }

    return new Response(
      JSON.stringify({
        score: result,
        // Include authority-aware metadata
        authorityMetadata: {
          weightedAVS,
          unweightedAVS: avs,
          isEstimated,
          degradedEngines,
          confidenceLevel: confidence >= 80 ? "high" : confidence >= 50 ? "medium" : "low",
          lowAuthorityImpact: degradedEngines.length > 0 
            ? `Score affected by ${degradedEngines.length} degraded engine(s): ${degradedEngines.join(", ")}`
            : undefined,
        },
        config: {
          version: config.version,
          weights: config.weights,
        },
        calculatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scoring engine error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
