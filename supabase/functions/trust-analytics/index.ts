// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TrustTrend {
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

interface EngineCorrelation {
  engineA: string;
  engineB: string;
  authorityCorrelation: number;
  disagreementFrequency: number;
  engineAWinRate: number;
  engineBWinRate: number;
}

interface HistoricalSnapshot {
  date: string;
  reliabilityScore: number;
  citationCompleteness: number;
  freshnessIndex: number;
  authorityWeight: number;
  totalQueries: number;
  successRate: number;
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
      // ========================================================================
      // GET TRUST TRENDS: Longitudinal authority analysis
      // ========================================================================
      case "getTrustTrends": {
        const { engine, trendType = "30d" } = params;
        
        let query = supabase
          .from("trust_trends")
          .select(`
            *,
            engine_authority!inner(display_name, authority_weight)
          `)
          .eq("trend_type", trendType)
          .order("trend_end_date", { ascending: false })
          .limit(1);
        
        if (engine) {
          query = query.eq("engine", engine);
        }
        
        const { data: trends, error } = await query;
        
        if (error) throw error;
        
        // Get current authority for comparison
        const { data: currentAuthority } = await supabase
          .from("engine_authority")
          .select("engine, display_name, authority_weight");
        
        const authorityMap = new Map(
          (currentAuthority || []).map((a: any) => [a.engine, a])
        );
        
        const formattedTrends: TrustTrend[] = (trends || []).map((t: any) => ({
          engine: t.engine,
          displayName: t.engine_authority?.display_name || t.engine,
          trendType: t.trend_type,
          authorityChange: t.authority_change,
          authorityTrend: t.authority_trend,
          reliabilityChange: t.reliability_change,
          volatility: t.authority_volatility,
          outageCount: t.outage_count,
          totalOutageMinutes: t.total_outage_minutes,
          currentAuthority: authorityMap.get(t.engine)?.authority_weight || t.max_authority,
          prediction30d: t.predicted_authority_30d,
        }));
        
        return new Response(
          JSON.stringify({ trends: formattedTrends }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // GET HISTORICAL SNAPSHOTS: Daily authority data for charts
      // ========================================================================
      case "getHistoricalSnapshots": {
        const { engine, days = 30 } = params;
        
        if (!engine) {
          return new Response(
            JSON.stringify({ error: "engine parameter required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data: snapshots, error } = await supabase
          .from("authority_daily_snapshots")
          .select("*")
          .eq("engine", engine)
          .gte("snapshot_date", startDate.toISOString().split("T")[0])
          .order("snapshot_date", { ascending: true });
        
        if (error) throw error;
        
        const formattedSnapshots: HistoricalSnapshot[] = (snapshots || []).map((s: any) => ({
          date: s.snapshot_date,
          reliabilityScore: s.reliability_score,
          citationCompleteness: s.citation_completeness,
          freshnessIndex: s.freshness_index,
          authorityWeight: s.authority_weight,
          totalQueries: s.total_queries,
          successRate: s.total_queries > 0 
            ? (s.successful_queries / s.total_queries) * 100 
            : 0,
        }));
        
        return new Response(
          JSON.stringify({ 
            engine,
            days,
            snapshots: formattedSnapshots,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // GET ENGINE CORRELATIONS: Which engines move together?
      // ========================================================================
      case "getEngineCorrelations": {
        const { period = "30d" } = params;
        
        const { data: correlations, error } = await supabase
          .from("engine_correlations")
          .select("*")
          .eq("correlation_period", period);
        
        if (error) throw error;
        
        // Get engine display names
        const { data: engines } = await supabase
          .from("engine_authority")
          .select("engine, display_name");
        
        const nameMap = new Map((engines || []).map((e: any) => [e.engine, e.display_name]));
        
        const formattedCorrelations: EngineCorrelation[] = (correlations || []).map((c: any) => ({
          engineA: nameMap.get(c.engine_a) || c.engine_a,
          engineB: nameMap.get(c.engine_b) || c.engine_b,
          authorityCorrelation: c.authority_correlation,
          disagreementFrequency: c.disagreement_frequency,
          engineAWinRate: c.engine_a_win_rate,
          engineBWinRate: c.engine_b_win_rate,
        }));
        
        return new Response(
          JSON.stringify({ correlations: formattedCorrelations, period }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // CALCULATE CORRELATIONS: Compute engine correlations from snapshots
      // ========================================================================
      case "calculateCorrelations": {
        const { period = "30d" } = params;
        
        const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        // Get all snapshots for the period
        const { data: snapshots } = await supabase
          .from("authority_daily_snapshots")
          .select("*")
          .gte("snapshot_date", startDate.toISOString().split("T")[0]);
        
        if (!snapshots || snapshots.length === 0) {
          return new Response(
            JSON.stringify({ message: "No snapshot data available for correlation" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Group by engine
        const engineData: Record<string, number[]> = {};
        for (const s of snapshots) {
          if (!engineData[s.engine]) engineData[s.engine] = [];
          engineData[s.engine].push(s.authority_weight);
        }
        
        const engines = Object.keys(engineData);
        const correlations: any[] = [];
        
        // Calculate pairwise correlations
        for (let i = 0; i < engines.length; i++) {
          for (let j = i + 1; j < engines.length; j++) {
            const engineA = engines[i];
            const engineB = engines[j];
            const dataA = engineData[engineA];
            const dataB = engineData[engineB];
            
            // Simple Pearson correlation
            const n = Math.min(dataA.length, dataB.length);
            if (n < 3) continue;
            
            const meanA = dataA.slice(0, n).reduce((a, b) => a + b, 0) / n;
            const meanB = dataB.slice(0, n).reduce((a, b) => a + b, 0) / n;
            
            let numerator = 0;
            let denomA = 0;
            let denomB = 0;
            
            for (let k = 0; k < n; k++) {
              const diffA = dataA[k] - meanA;
              const diffB = dataB[k] - meanB;
              numerator += diffA * diffB;
              denomA += diffA * diffA;
              denomB += diffB * diffB;
            }
            
            const correlation = denomA > 0 && denomB > 0
              ? numerator / Math.sqrt(denomA * denomB)
              : 0;
            
            // Get disagreement data
            const { data: disagreements } = await supabase
              .from("engine_disagreements")
              .select("winner")
              .or(`engine_a.eq.${engineA},engine_b.eq.${engineA}`)
              .or(`engine_a.eq.${engineB},engine_b.eq.${engineB}`)
              .gte("created_at", startDate.toISOString());
            
            const totalDisagreements = disagreements?.length || 0;
            const engineAWins = disagreements?.filter((d: any) => d.winner === engineA).length || 0;
            const engineBWins = disagreements?.filter((d: any) => d.winner === engineB).length || 0;
            
            // Upsert correlation
            await supabase.from("engine_correlations").upsert({
              engine_a: engineA < engineB ? engineA : engineB,
              engine_b: engineA < engineB ? engineB : engineA,
              correlation_period: period,
              authority_correlation: Math.round(correlation * 10000) / 10000,
              disagreement_frequency: totalDisagreements / days,
              engine_a_win_rate: totalDisagreements > 0 
                ? (engineA < engineB ? engineAWins : engineBWins) / totalDisagreements * 100 
                : 50,
              engine_b_win_rate: totalDisagreements > 0 
                ? (engineA < engineB ? engineBWins : engineAWins) / totalDisagreements * 100 
                : 50,
              calculated_at: new Date().toISOString(),
            }, {
              onConflict: "engine_a,engine_b,correlation_period",
            });
            
            correlations.push({
              engineA,
              engineB,
              correlation: Math.round(correlation * 10000) / 10000,
            });
          }
        }
        
        return new Response(
          JSON.stringify({ 
            calculated: correlations.length,
            period,
            correlations,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // GENERATE DAILY SNAPSHOT: Create today's authority snapshot
      // ========================================================================
      case "generateDailySnapshot": {
        const { data: count, error } = await supabase.rpc("generate_authority_snapshot");
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ 
            success: true,
            enginesSnapshotted: count,
            date: new Date().toISOString().split("T")[0],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // CALCULATE TRUST TRENDS: Update trend analysis for an engine
      // ========================================================================
      case "calculateTrustTrends": {
        const { engine, trendTypes = ["7d", "30d", "90d"] } = params;
        
        const results: any[] = [];
        
        for (const trendType of trendTypes) {
          try {
            await supabase.rpc("calculate_trust_trends", {
              p_engine: engine,
              p_trend_type: trendType,
            });
            results.push({ engine, trendType, success: true });
          } catch (err) {
            results.push({ engine, trendType, success: false, error: String(err) });
          }
        }
        
        return new Response(
          JSON.stringify({ results }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // GET TRUST SUMMARY: Executive summary of trust across all engines
      // ========================================================================
      case "getTrustSummary": {
        // Get current authority
        const { data: engines } = await supabase
          .from("engine_authority")
          .select("*")
          .order("authority_weight", { ascending: false });
        
        // Get 30d trends
        const { data: trends } = await supabase
          .from("trust_trends")
          .select("*")
          .eq("trend_type", "30d");
        
        const trendMap = new Map((trends || []).map((t: any) => [t.engine, t]));
        
        // Get active outages
        const { data: outages } = await supabase
          .from("engine_outages")
          .select("*")
          .is("ended_at", null);
        
        const summary = {
          totalEngines: engines?.length || 0,
          healthyEngines: engines?.filter((e: any) => e.status === "healthy").length || 0,
          degradedEngines: engines?.filter((e: any) => e.status === "degraded").length || 0,
          unavailableEngines: engines?.filter((e: any) => e.status === "unavailable").length || 0,
          activeOutages: outages?.length || 0,
          avgAuthority: engines?.length 
            ? engines.reduce((sum: number, e: any) => sum + e.authority_weight, 0) / engines.length 
            : 0,
          enginesImproving: trends?.filter((t: any) => t.authority_trend === "improving").length || 0,
          enginesDeclining: trends?.filter((t: any) => t.authority_trend === "declining").length || 0,
          enginesStable: trends?.filter((t: any) => t.authority_trend === "stable").length || 0,
          engines: (engines || []).map((e: any) => {
            const trend = trendMap.get(e.engine);
            return {
              engine: e.engine,
              displayName: e.display_name,
              status: e.status,
              authorityWeight: e.authority_weight,
              reliabilityScore: e.reliability_score,
              trend30d: trend?.authority_trend || "unknown",
              authorityChange30d: trend?.authority_change || 0,
              outages30d: trend?.outage_count || 0,
            };
          }),
        };
        
        // Generate executive statement
        let executiveStatement = "";
        if (summary.unavailableEngines > 0) {
          executiveStatement = `⚠️ ${summary.unavailableEngines} engine(s) currently unavailable. Scores are estimated.`;
        } else if (summary.enginesDeclining > summary.enginesImproving) {
          executiveStatement = `📉 Trust is declining across ${summary.enginesDeclining} engine(s). Review authority audit logs.`;
        } else if (summary.enginesImproving > 0) {
          executiveStatement = `📈 Trust is improving across ${summary.enginesImproving} engine(s). System health is good.`;
        } else {
          executiveStatement = `✓ All ${summary.totalEngines} engines stable. System operating normally.`;
        }
        
        return new Response(
          JSON.stringify({ 
            summary,
            executiveStatement,
            generatedAt: new Date().toISOString(),
          }),
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
    console.error("Trust analytics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
