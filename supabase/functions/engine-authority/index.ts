// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// EXPLANATORY INTELLIGENCE TYPES
// ============================================================================

interface AuthorityExplanation {
  engine: string;
  currentWeight: number;
  trustLevel: "high" | "medium" | "low";
  whyTrustworthy: string[];
  whyCautious: string[];
  recentChanges: Array<{
    date: string;
    change: string;
    impact: number;
  }>;
  comparedToOthers: string;
}

interface DisagreementAnalysis {
  promptId: string;
  disagreements: Array<{
    type: string;
    engines: string[];
    winner?: string;
    explanation: string;
  }>;
  convergenceScore: number;
  recommendation: string;
}

interface ConfidencePropagation {
  originalScore: number;
  adjustedScore: number;
  reliabilityPercentage: number;
  confidenceMultiplier: number;
  explanation: string;
  degradationSources: Array<{
    engine: string;
    reason: string;
    impact: number;
  }>;
}

interface EngineAuthority {
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
}

interface WeightedAVSResult {
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

// Calculate confidence level based on engine health
function calculateConfidenceLevel(
  engines: EngineAuthority[],
  degradedCount: number
): "high" | "medium" | "low" {
  const healthyCount = engines.filter(e => e.status === "healthy").length;
  const totalCount = engines.length;
  
  if (healthyCount === totalCount && degradedCount === 0) return "high";
  if (healthyCount >= totalCount * 0.7) return "medium";
  return "low";
}

// Get fallback data for unavailable engine
async function getFallbackSnapshot(
  supabase: any,
  engine: string
): Promise<any | null> {
  const { data } = await supabase
    .from("engine_snapshots")
    .select("*")
    .eq("engine", engine)
    .in("snapshot_type", ["hourly", "daily"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  return data;
}

// Record engine outage
async function recordOutage(
  supabase: any,
  engine: string,
  snapshotId?: string
): Promise<void> {
  // Check if there's already an active outage
  const { data: existing } = await supabase
    .from("engine_outages")
    .select("id")
    .eq("engine", engine)
    .is("ended_at", null)
    .single();
  
  if (!existing) {
    await supabase.from("engine_outages").insert({
      engine,
      fallback_snapshot_id: snapshotId,
    });
  }
}

// End engine outage
async function endOutage(
  supabase: any,
  engine: string,
  resolutionType: string = "auto_recovered"
): Promise<void> {
  await supabase
    .from("engine_outages")
    .update({
      ended_at: new Date().toISOString(),
      resolution_type: resolutionType,
    })
    .eq("engine", engine)
    .is("ended_at", null);
}

// Broadcast system notification
async function broadcastNotification(
  supabase: any,
  type: string,
  title: string,
  message: string,
  severity: "info" | "warning" | "critical",
  engine?: string,
  metadata?: any
): Promise<void> {
  await supabase.from("system_notifications").insert({
    notification_type: type,
    title,
    message,
    severity,
    related_engine: engine,
    metadata,
    auto_dismiss_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...params } = await req.json();

    switch (action) {
      case "getAuthority": {
        // Get all engine authority data
        const { data: engines, error } = await supabase
          .from("engine_authority")
          .select("*")
          .order("authority_weight", { ascending: false });
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ engines }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // EXPLANATORY INTELLIGENCE: Why should you trust this engine?
      // ========================================================================
      case "explainAuthority": {
        const { engine } = params;
        
        const { data: engineData } = await supabase
          .from("engine_authority")
          .select("*")
          .eq("engine", engine)
          .single();
        
        if (!engineData) {
          return new Response(
            JSON.stringify({ error: "Engine not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Get recent authority changes for audit trail
        const { data: recentChanges } = await supabase
          .from("authority_audit_log")
          .select("*")
          .eq("engine", engine)
          .order("created_at", { ascending: false })
          .limit(5);
        
        // Get all engines for comparison
        const { data: allEngines } = await supabase
          .from("engine_authority")
          .select("engine, display_name, authority_weight")
          .order("authority_weight", { ascending: false });
        
        const rank = (allEngines || []).findIndex((e: any) => e.engine === engine) + 1;
        const totalEngines = (allEngines || []).length;
        
        // Build explanation - WHY should you trust this engine?
        const whyTrustworthy: string[] = [];
        const whyCautious: string[] = [];
        
        if (engineData.reliability_score >= 85) {
          whyTrustworthy.push(`High reliability: ${engineData.reliability_score.toFixed(0)}% success rate over ${engineData.total_queries} queries`);
        } else if (engineData.reliability_score < 70) {
          whyCautious.push(`Lower reliability: ${engineData.reliability_score.toFixed(0)}% success rate`);
        }
        
        if (engineData.citation_completeness >= 85) {
          whyTrustworthy.push(`Excellent citation coverage: ${engineData.citation_completeness.toFixed(0)}% of responses include verifiable sources`);
        } else if (engineData.citation_completeness < 60) {
          whyCautious.push(`Limited citations: Only ${engineData.citation_completeness.toFixed(0)}% of responses cite sources`);
        }
        
        if (engineData.freshness_index >= 85) {
          whyTrustworthy.push(`Fresh knowledge base: ${engineData.freshness_index.toFixed(0)}% freshness score`);
        } else if (engineData.freshness_index < 60) {
          whyCautious.push(`Potentially stale data: ${engineData.freshness_index.toFixed(0)}% freshness score`);
        }
        
        if (engineData.consecutive_failures > 0) {
          whyCautious.push(`Recent issues: ${engineData.consecutive_failures} consecutive failures`);
        }
        
        if (engineData.hallucination_rate && engineData.hallucination_rate > 0.1) {
          whyCautious.push(`Hallucination risk: ${(engineData.hallucination_rate * 100).toFixed(1)}% hallucination rate detected`);
        }
        
        if (engineData.status === "degraded") {
          whyCautious.push("Currently experiencing degraded performance");
        } else if (engineData.status === "unavailable") {
          whyCautious.push("Currently unavailable - using fallback data");
        }
        
        const trustLevel = engineData.authority_weight >= 1.1 ? "high" :
                          engineData.authority_weight >= 0.9 ? "medium" : "low";
        
        const explanation: AuthorityExplanation = {
          engine,
          currentWeight: engineData.authority_weight,
          trustLevel,
          whyTrustworthy,
          whyCautious,
          recentChanges: (recentChanges || []).map((c: any) => ({
            date: c.created_at,
            change: c.explanation,
            impact: c.new_authority_weight - c.previous_authority_weight,
          })),
          comparedToOthers: `Ranked #${rank} of ${totalEngines} engines by authority weight`,
        };
        
        return new Response(
          JSON.stringify({ explanation }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // CROSS-ENGINE DISAGREEMENT: When engines disagree, who wins and why?
      // ========================================================================
      case "analyzeDisagreements": {
        const { promptId } = params;
        
        // Get all engine results for this prompt
        const { data: results } = await supabase
          .from("engine_results")
          .select("*")
          .eq("prompt_id", promptId);
        
        if (!results || results.length < 2) {
          return new Response(
            JSON.stringify({ 
              analysis: {
                promptId,
                disagreements: [],
                convergenceScore: 100,
                recommendation: "Insufficient data for disagreement analysis (need 2+ engines)",
              }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Get engine authority for weighting decisions
        const { data: authorities } = await supabase
          .from("engine_authority")
          .select("*");
        
        const authorityMap = new Map((authorities || []).map((a: any) => [a.engine, a]));
        
        const disagreements: DisagreementAnalysis["disagreements"] = [];
        
        // Check brand mention disagreement
        const mentionResults = results.map((r: any) => ({ engine: r.engine, value: r.brand_mentioned }));
        const mentionValues = new Set(mentionResults.map(r => r.value));
        
        if (mentionValues.size > 1) {
          const yesEngines = mentionResults.filter(r => r.value).map(r => r.engine);
          const noEngines = mentionResults.filter(r => !r.value).map(r => r.engine);
          
          // Determine winner by authority weight
          const yesWeight = yesEngines.reduce((sum: number, e: string) => sum + (authorityMap.get(e)?.authority_weight || 1), 0);
          const noWeight = noEngines.reduce((sum: number, e: string) => sum + (authorityMap.get(e)?.authority_weight || 1), 0);
          
          const winner = yesWeight > noWeight ? "mentioned" : "not_mentioned";
          const winningEngines = winner === "mentioned" ? yesEngines : noEngines;
          
          disagreements.push({
            type: "brand_mention",
            engines: [...yesEngines, ...noEngines],
            winner,
            explanation: `${yesEngines.length} engine(s) detected brand mention (${yesEngines.join(", ")}), ` +
              `${noEngines.length} did not (${noEngines.join(", ")}). ` +
              `Authority-weighted decision: Brand ${winner === "mentioned" ? "IS" : "NOT"} mentioned ` +
              `(authority: ${yesWeight.toFixed(2)} vs ${noWeight.toFixed(2)}).`,
          });
          
          // Record disagreement for audit
          for (const yesEngine of yesEngines) {
            for (const noEngine of noEngines) {
              await supabase.from("engine_disagreements").insert({
                prompt_id: promptId,
                engine_a: yesEngine,
                engine_b: noEngine,
                disagreement_type: "brand_mention",
                engine_a_value: { mentioned: true },
                engine_b_value: { mentioned: false },
                winner: winner === "mentioned" ? yesEngine : noEngine,
                resolution_method: "authority_weighted",
                resolution_explanation: `Authority: ${yesEngine}=${authorityMap.get(yesEngine)?.authority_weight?.toFixed(2)}, ${noEngine}=${authorityMap.get(noEngine)?.authority_weight?.toFixed(2)}`,
                authority_impact_a: winner === "mentioned" ? 0.01 : -0.01,
                authority_impact_b: winner === "mentioned" ? -0.01 : 0.01,
              });
            }
          }
        }
        
        // Check sentiment disagreement
        const sentimentResults = results.filter((r: any) => r.sentiment).map((r: any) => ({ engine: r.engine, value: r.sentiment }));
        const sentimentValues = new Set(sentimentResults.map(r => r.value));
        
        if (sentimentValues.size > 1) {
          const sentimentGroups: Record<string, string[]> = {};
          sentimentResults.forEach((r: any) => {
            if (!sentimentGroups[r.value]) sentimentGroups[r.value] = [];
            sentimentGroups[r.value].push(r.engine);
          });
          
          // Find majority by authority weight
          let maxWeight = 0;
          let winner = "";
          for (const [sentiment, engines] of Object.entries(sentimentGroups)) {
            const weight = engines.reduce((sum, e) => sum + (authorityMap.get(e)?.authority_weight || 1), 0);
            if (weight > maxWeight) {
              maxWeight = weight;
              winner = sentiment;
            }
          }
          
          disagreements.push({
            type: "sentiment",
            engines: sentimentResults.map((r: any) => r.engine),
            winner,
            explanation: `Engines disagree on sentiment: ${Object.entries(sentimentGroups).map(([s, e]) => `${s} (${e.join(", ")})`).join(" vs ")}. ` +
              `Authority-weighted consensus: ${winner}.`,
          });
        }
        
        // Calculate convergence score (0-100)
        const totalChecks = 2;
        const agreementCount = totalChecks - disagreements.length;
        const convergenceScore = Math.round((agreementCount / totalChecks) * 100);
        
        // Generate actionable recommendation
        let recommendation = "";
        if (convergenceScore >= 80) {
          recommendation = "High engine agreement. Scores are reliable and defensible.";
        } else if (convergenceScore >= 50) {
          recommendation = "Moderate disagreement. The authority-weighted consensus is your best answer, but verify with additional data if this is a high-stakes decision.";
        } else {
          recommendation = "Significant engine disagreement. Treat scores with caution. Prioritize results from high-authority engines (Google AI Mode, Perplexity) and consider manual verification.";
        }
        
        const analysis: DisagreementAnalysis = {
          promptId,
          disagreements,
          convergenceScore,
          recommendation,
        };
        
        return new Response(
          JSON.stringify({ analysis }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // AUTHORITY DECAY: Self-correcting trust
      // ========================================================================
      case "applyDecay": {
        const { data: decayResults, error } = await supabase.rpc("apply_authority_decay");
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ 
            decayApplied: decayResults || [],
            message: decayResults?.length 
              ? `Applied decay to ${decayResults.length} engine(s)` 
              : "No decay rules triggered",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // CONFIDENCE PROPAGATION: How much trust should you place in this score?
      // ========================================================================
      case "calculateConfidence": {
        const { promptId } = params;
        
        const { data: propagation, error } = await supabase.rpc(
          "calculate_confidence_propagation",
          { p_prompt_id: promptId }
        );
        
        if (error) throw error;
        
        const result = propagation?.[0];
        
        return new Response(
          JSON.stringify({
            confidence: {
              reliabilityPercentage: result?.reliability_percentage || 100,
              confidenceMultiplier: result?.confidence_multiplier || 1.0,
              explanation: result?.degradation_explanation || "All engines healthy. Full confidence.",
              originalScore: result?.original_avs || 0,
              adjustedScore: result?.adjusted_avs || 0,
              slaStatement: `This metric is ${result?.reliability_percentage || 100}% reliable today.`,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // AUDIT TRAIL: Why did authority change?
      // ========================================================================
      case "getAuditTrail": {
        const { engine, days = 7 } = params;
        
        const { data: auditLog, error } = await supabase.rpc(
          "explain_authority_change",
          { p_engine: engine, p_days: days }
        );
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ 
            auditTrail: auditLog || [],
            engine,
            periodDays: days,
            summary: auditLog?.length 
              ? `${auditLog.length} authority change(s) in the last ${days} days`
              : `No authority changes in the last ${days} days`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "calculateWeightedAVS": {
        const { promptId, engineResults } = params;
        
        if (!engineResults || !Array.isArray(engineResults)) {
          return new Response(
            JSON.stringify({ error: "engineResults array required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Get current engine authority
        const { data: authorities } = await supabase
          .from("engine_authority")
          .select("*");
        
        const authorityMap = new Map(
          (authorities || []).map((a: EngineAuthority) => [a.engine, a])
        );
        
        let totalWeighted = 0;
        let totalUnweighted = 0;
        let totalWeight = 0;
        const breakdown: WeightedAVSResult["engineBreakdown"] = [];
        const degradedEngines: string[] = [];
        const lowAuthorityEngines: string[] = [];
        let isEstimated = false;
        
        for (const result of engineResults) {
          const authority = authorityMap.get(result.engine) as EngineAuthority | undefined;
          const weight = authority?.authority_weight || 1.0;
          const status = authority?.status || "healthy";
          const displayName = authority?.display_name || result.engine;
          
          let score = result.score || 0;
          
          // Handle degraded/unavailable engines
          if (status === "unavailable") {
            const snapshot = await getFallbackSnapshot(supabase, result.engine);
            if (snapshot) {
              score = snapshot.reliability_score * 0.8; // Reduced confidence
              isEstimated = true;
              degradedEngines.push(result.engine);
            }
          } else if (status === "degraded") {
            degradedEngines.push(result.engine);
          }
          
          const weightedScore = score * weight;
          
          totalWeighted += weightedScore;
          totalUnweighted += score;
          totalWeight += weight;
          
          breakdown.push({
            engine: result.engine,
            displayName,
            rawScore: score,
            authorityWeight: weight,
            weightedScore: Math.round(weightedScore * 100) / 100,
            status,
          });
          
          if (weight < 1.0) {
            lowAuthorityEngines.push(displayName);
          }
        }
        
        const engineCount = engineResults.length;
        const weightedAVS = engineCount > 0 ? Math.round(totalWeighted / totalWeight) : 0;
        const unweightedAVS = engineCount > 0 ? Math.round(totalUnweighted / engineCount) : 0;
        
        const result: WeightedAVSResult = {
          weightedAVS,
          unweightedAVS,
          engineBreakdown: breakdown,
          degradedEngines,
          confidenceLevel: calculateConfidenceLevel(
            Array.from(authorityMap.values()) as EngineAuthority[],
            degradedEngines.length
          ),
          isEstimated,
        };
        
        if (lowAuthorityEngines.length > 0) {
          result.lowAuthorityImpact = `Score affected by low-authority engines: ${lowAuthorityEngines.join(", ")}`;
        }
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "updateAuthority": {
        const { engine, success, responseTimeMs, citationCount } = params;
        
        // Get current state
        const { data: current } = await supabase
          .from("engine_authority")
          .select("*")
          .eq("engine", engine)
          .single();
        
        if (!current) {
          return new Response(
            JSON.stringify({ error: "Engine not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const newTotalQueries = current.total_queries + 1;
        const newSuccessfulQueries = success ? current.successful_queries + 1 : current.successful_queries;
        const newConsecutiveFailures = success ? 0 : current.consecutive_failures + 1;
        
        // Calculate new reliability
        const newReliability = newTotalQueries > 10
          ? Math.min(100, Math.max(0, (newSuccessfulQueries / newTotalQueries) * 100))
          : current.reliability_score;
        
        // Calculate new status
        let newStatus = "healthy";
        if (newConsecutiveFailures >= 5) newStatus = "unavailable";
        else if (newConsecutiveFailures >= 3) newStatus = "degraded";
        
        // Calculate new authority weight
        let newWeight = 0.8 + 
          (newReliability / 100) * 0.4 + 
          (current.citation_completeness / 100) * 0.2 + 
          (current.freshness_index / 100) * 0.1;
        
        if (newConsecutiveFailures >= 5) newWeight = 0.5;
        else if (newConsecutiveFailures >= 3) newWeight = 0.75;
        newWeight = Math.min(1.5, newWeight);
        
        // Update database
        const { error } = await supabase
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
        
        if (error) throw error;
        
        // Handle status transitions
        if (current.status !== newStatus) {
          if (newStatus === "unavailable") {
            const snapshot = await getFallbackSnapshot(supabase, engine);
            await recordOutage(supabase, engine, snapshot?.id);
            await broadcastNotification(
              supabase,
              "engine_outage",
              `${current.display_name} Unavailable`,
              `${current.display_name} is currently unavailable. Scores will use estimated values.`,
              "warning",
              engine
            );
          } else if (current.status === "unavailable" && newStatus === "healthy") {
            await endOutage(supabase, engine);
            await broadcastNotification(
              supabase,
              "engine_recovered",
              `${current.display_name} Recovered`,
              `${current.display_name} is back online. Scores will be recalculated.`,
              "info",
              engine
            );
          }
        }
        
        return new Response(
          JSON.stringify({
            engine,
            previousStatus: current.status,
            newStatus,
            authorityWeight: newWeight,
            reliabilityScore: newReliability,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "createSnapshot": {
        const { engine, snapshotType = "hourly" } = params;
        
        const { data: current } = await supabase
          .from("engine_authority")
          .select("*")
          .eq("engine", engine)
          .single();
        
        if (!current) {
          return new Response(
            JSON.stringify({ error: "Engine not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const { data: snapshot, error } = await supabase
          .from("engine_snapshots")
          .insert({
            engine,
            snapshot_type: snapshotType,
            reliability_score: current.reliability_score,
            citation_completeness: current.citation_completeness,
            freshness_index: current.freshness_index,
            authority_weight: current.authority_weight,
            status: current.status,
            success_rate: current.total_queries > 0
              ? (current.successful_queries / current.total_queries) * 100
              : null,
            avg_response_time_ms: current.avg_response_time_ms,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ snapshot }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getActiveOutages": {
        const { data: outages, error } = await supabase
          .from("engine_outages")
          .select(`
            *,
            engine_authority!inner(display_name)
          `)
          .is("ended_at", null);
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ outages }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Engine authority error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
