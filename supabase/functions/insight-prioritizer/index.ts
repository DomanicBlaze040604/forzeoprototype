// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InsightInput {
  type: string;
  title: string;
  description: string;
  brandId?: string;
  affectedPrompts?: string[];
  affectedEngines?: string[];
  currentScore?: number;
  previousScore?: number;
  competitorData?: any;
  engineAuthorityContext?: any;
}

interface PrioritizedInsight {
  id?: string;
  insightType: string;
  title: string;
  description: string;
  severityScore: number;
  confidenceScore: number;
  estimatedEffort: "low" | "medium" | "high";
  estimatedUpside: number;
  priorityRank: number;
  recommendedAction: string;
  actionCategory: string;
  impactExplanation: string;
  engineAuthorityContext: any;
}

// Calculate severity based on insight type and magnitude
function calculateSeverity(input: InsightInput): number {
  const { type, currentScore, previousScore } = input;
  
  switch (type) {
    case "visibility_drop": {
      const drop = (previousScore || 0) - (currentScore || 0);
      if (drop >= 30) return 95;
      if (drop >= 20) return 80;
      if (drop >= 10) return 60;
      return 40;
    }
    case "competitor_overtake":
      return 85;
    case "citation_opportunity":
      return 50;
    case "content_gap":
      return 65;
    case "sentiment_shift":
      return 55;
    case "engine_specific":
      return 45;
    case "authority_change":
      return 70;
    default:
      return 50;
  }
}

// Calculate confidence based on data quality
function calculateConfidence(input: InsightInput, engineAuthority: any[]): number {
  let confidence = 70; // Base confidence
  
  // More affected prompts = higher confidence
  if (input.affectedPrompts && input.affectedPrompts.length > 5) {
    confidence += 15;
  } else if (input.affectedPrompts && input.affectedPrompts.length > 2) {
    confidence += 8;
  }
  
  // Check engine authority for affected engines
  if (input.affectedEngines && engineAuthority) {
    const avgAuthority = input.affectedEngines.reduce((sum, engine) => {
      const auth = engineAuthority.find(a => a.engine === engine);
      return sum + (auth?.reliability_score || 50);
    }, 0) / input.affectedEngines.length;
    
    confidence = Math.round(confidence * (avgAuthority / 100));
  }
  
  return Math.min(100, Math.max(0, confidence));
}

// Estimate effort required
function estimateEffort(input: InsightInput): "low" | "medium" | "high" {
  const { type, affectedPrompts } = input;
  
  // Content updates are typically medium effort
  if (type === "content_gap" || type === "citation_opportunity") {
    return affectedPrompts && affectedPrompts.length > 5 ? "high" : "medium";
  }
  
  // Technical fixes vary
  if (type === "engine_specific") {
    return "low";
  }
  
  // Strategy changes are high effort
  if (type === "competitor_overtake" || type === "authority_change") {
    return "high";
  }
  
  return "medium";
}

// Estimate potential upside (AVS lift)
function estimateUpside(input: InsightInput): number {
  const { type, currentScore, previousScore } = input;
  
  switch (type) {
    case "visibility_drop":
      // Potential to recover lost ground
      return Math.min(100, Math.max(0, (previousScore || 0) - (currentScore || 0) + 10));
    case "competitor_overtake":
      return 25; // Moderate upside from competitive response
    case "citation_opportunity":
      return 35; // Good upside from citation improvements
    case "content_gap":
      return 40; // High upside from filling gaps
    case "sentiment_shift":
      return 20;
    case "engine_specific":
      return 15;
    case "authority_change":
      return 30;
    default:
      return 25;
  }
}

// Generate recommended action
function generateRecommendation(input: InsightInput): { action: string; category: string } {
  const { type, affectedEngines } = input;
  
  switch (type) {
    case "visibility_drop":
      return {
        action: "Review and update content targeting affected queries. Focus on adding structured data and improving E-E-A-T signals.",
        category: "content_update",
      };
    case "competitor_overtake":
      return {
        action: "Analyze competitor content strategy. Identify gaps in your coverage and create comprehensive content to reclaim position.",
        category: "strategy_change",
      };
    case "citation_opportunity":
      return {
        action: "Create authoritative content on this topic. Include original research, expert quotes, and comprehensive coverage.",
        category: "new_content",
      };
    case "content_gap":
      return {
        action: "Develop new content addressing this topic cluster. Ensure comprehensive coverage with supporting pages.",
        category: "new_content",
      };
    case "sentiment_shift":
      return {
        action: "Review recent brand mentions and address any negative sentiment drivers. Consider proactive reputation management.",
        category: "monitoring",
      };
    case "engine_specific":
      return {
        action: `Optimize content specifically for ${affectedEngines?.join(", ") || "affected engines"}. Review their content preferences and citation patterns.`,
        category: "technical_fix",
      };
    case "authority_change":
      return {
        action: "Engine authority has shifted. Review scoring methodology and adjust strategy for engines with changed weights.",
        category: "strategy_change",
      };
    default:
      return {
        action: "Review the affected areas and develop an action plan.",
        category: "monitoring",
      };
  }
}

// Generate impact explanation with engine authority context
function generateImpactExplanation(
  input: InsightInput,
  engineAuthority: any[],
  severity: number
): string {
  const { type, affectedEngines, currentScore, previousScore } = input;
  
  let explanation = "";
  
  // Add severity context
  if (severity >= 80) {
    explanation = "HIGH PRIORITY: ";
  } else if (severity >= 60) {
    explanation = "MODERATE PRIORITY: ";
  }
  
  // Add type-specific explanation
  switch (type) {
    case "visibility_drop":
      const drop = (previousScore || 0) - (currentScore || 0);
      explanation += `Your visibility dropped ${drop} points. `;
      break;
    case "competitor_overtake":
      explanation += "A competitor has overtaken your position. ";
      break;
    default:
      explanation += `${input.title}. `;
  }
  
  // Add engine authority context
  if (affectedEngines && engineAuthority) {
    const lowAuthorityEngines = affectedEngines.filter(engine => {
      const auth = engineAuthority.find(a => a.engine === engine);
      return auth && auth.authority_weight < 1.0;
    });
    
    const highAuthorityEngines = affectedEngines.filter(engine => {
      const auth = engineAuthority.find(a => a.engine === engine);
      return auth && auth.authority_weight >= 1.1;
    });
    
    if (lowAuthorityEngines.length > 0 && highAuthorityEngines.length === 0) {
      explanation += "This primarily affects low-authority engines, so the overall impact is limited. ";
    } else if (highAuthorityEngines.length > 0) {
      explanation += `This affects high-authority engines (${highAuthorityEngines.join(", ")}), making it a priority. `;
    }
  }
  
  return explanation.trim();
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case "prioritize": {
        const { insights } = params as { insights: InsightInput[] };
        
        if (!insights || !Array.isArray(insights)) {
          return new Response(
            JSON.stringify({ error: "insights array required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Get engine authority for context
        const { data: engineAuthority } = await supabase
          .from("engine_authority")
          .select("*");
        
        const prioritized: PrioritizedInsight[] = insights.map(input => {
          const severity = calculateSeverity(input);
          const confidence = calculateConfidence(input, engineAuthority || []);
          const effort = estimateEffort(input);
          const upside = estimateUpside(input);
          const { action: recommendedAction, category } = generateRecommendation(input);
          const impact = generateImpactExplanation(input, engineAuthority || [], severity);
          
          // Calculate priority rank (same formula as DB)
          const effortScore = effort === "low" ? 30 : effort === "medium" ? 20 : 10;
          const priorityRank = Math.round(
            severity * 0.35 + confidence * 0.25 + effortScore * 0.2 + upside * 0.2
          );
          
          return {
            insightType: input.type,
            title: input.title,
            description: input.description,
            severityScore: severity,
            confidenceScore: confidence,
            estimatedEffort: effort,
            estimatedUpside: upside,
            priorityRank,
            recommendedAction,
            actionCategory: category,
            impactExplanation: impact,
            engineAuthorityContext: input.engineAuthorityContext || {},
          };
        });
        
        // Sort by priority rank descending
        prioritized.sort((a, b) => b.priorityRank - a.priorityRank);
        
        return new Response(
          JSON.stringify({ insights: prioritized }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "store": {
        const { insights, brandId } = params as { 
          insights: PrioritizedInsight[]; 
          brandId?: string;
        };
        
        if (!insights || !Array.isArray(insights)) {
          return new Response(
            JSON.stringify({ error: "insights array required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const insightsToStore = insights.map(insight => ({
          user_id: user.id,
          brand_id: brandId,
          insight_type: insight.insightType,
          title: insight.title,
          description: insight.description,
          severity_score: insight.severityScore,
          confidence_score: insight.confidenceScore,
          estimated_effort: insight.estimatedEffort,
          estimated_upside: insight.estimatedUpside,
          recommended_action: insight.recommendedAction,
          action_category: insight.actionCategory,
          impact_explanation: insight.impactExplanation,
          engine_authority_context: insight.engineAuthorityContext,
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        }));
        
        const { data, error } = await supabase
          .from("prioritized_insights")
          .insert(insightsToStore)
          .select();
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ stored: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getWeeklyPriorities": {
        const { brandId, limit = 3 } = params;
        
        // Get priorities with generated summaries
        const { data, error } = await supabase.rpc("get_weekly_priorities", {
          p_user_id: user.id,
          p_brand_id: brandId || null,
          p_limit: limit,
        });
        
        if (error) throw error;
        
        // Generate decision compression for each insight
        const priorities = [];
        for (const insight of (data || [])) {
          // Generate single-action summary if not already present
          if (!insight.single_action_summary) {
            await supabase.rpc("generate_insight_summary", { p_insight_id: insight.id });
            
            // Refetch with generated summary
            const { data: updated } = await supabase
              .from("prioritized_insights")
              .select("*")
              .eq("id", insight.id)
              .single();
            
            if (updated) {
              priorities.push(updated);
              continue;
            }
          }
          priorities.push(insight);
        }
        
        // Generate the "If you only do one thing" statement
        const topPriority = priorities[0];
        const oneThingStatement = topPriority 
          ? `If you only do one thing this week: ${topPriority.single_action_summary || topPriority.recommended_action}`
          : "No priority actions this week.";
        
        return new Response(
          JSON.stringify({ 
            priorities,
            title: "What to fix this week",
            subtitle: `Top ${limit} actions ranked by impact and effort`,
            oneThingStatement,
            decisionFramework: {
              topAction: topPriority?.single_action_summary,
              opportunityCost: topPriority?.opportunity_cost,
              whyThisFirst: topPriority?.why_rank_one,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // NEW: Assign insight to team member with deadline
      // ========================================================================
      case "assignInsight": {
        const { insightId, assignedTo, deadline, slaHours } = params;
        
        const updateData: any = {
          assigned_to: assignedTo,
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        if (deadline) {
          updateData.deadline = deadline;
        } else if (slaHours) {
          updateData.deadline = new Date(Date.now() + slaHours * 60 * 60 * 1000).toISOString();
          updateData.sla_hours = slaHours;
        }
        
        const { error } = await supabase
          .from("prioritized_insights")
          .update(updateData)
          .eq("id", insightId)
          .eq("user_id", user.id);
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ 
            success: true,
            message: `Insight assigned${deadline ? ` with deadline ${deadline}` : ""}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // NEW: Compare two insights - why does #1 beat #2?
      // ========================================================================
      case "compareInsights": {
        const { insightAId, insightBId } = params;
        
        const { data: insights } = await supabase
          .from("prioritized_insights")
          .select("*")
          .in("id", [insightAId, insightBId]);
        
        if (!insights || insights.length !== 2) {
          return new Response(
            JSON.stringify({ error: "Both insights must exist" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const [a, b] = insights[0].id === insightAId ? insights : [insights[1], insights[0]];
        
        const severityDelta = a.severity_score - b.severity_score;
        const confidenceDelta = a.confidence_score - b.confidence_score;
        const upsideDelta = a.estimated_upside - b.estimated_upside;
        
        const effortRank = { low: 3, medium: 2, high: 1 };
        const effortAdvantage = effortRank[a.estimated_effort as keyof typeof effortRank] > 
                               effortRank[b.estimated_effort as keyof typeof effortRank] 
                               ? "a_easier" : effortRank[a.estimated_effort as keyof typeof effortRank] < 
                               effortRank[b.estimated_effort as keyof typeof effortRank] ? "b_easier" : "equal";
        
        // Determine decisive factor
        let decisiveFactor = "";
        if (Math.abs(severityDelta) >= 15) {
          decisiveFactor = severityDelta > 0 ? "Higher severity impact" : "Lower severity impact";
        } else if (Math.abs(upsideDelta) >= 10) {
          decisiveFactor = upsideDelta > 0 ? "Greater upside potential" : "Lower upside potential";
        } else if (effortAdvantage !== "equal") {
          decisiveFactor = effortAdvantage === "a_easier" ? "Lower effort required" : "Higher effort required";
        } else {
          decisiveFactor = "Marginal differences - both are valid priorities";
        }
        
        const explanation = `"${a.title}" ranks higher than "${b.title}" because: ` +
          `${severityDelta > 0 ? "Higher" : severityDelta < 0 ? "Lower" : "Equal"} severity (${a.severity_score} vs ${b.severity_score}), ` +
          `${effortAdvantage === "a_easier" ? "easier" : effortAdvantage === "b_easier" ? "harder" : "similar"} effort (${a.estimated_effort} vs ${b.estimated_effort}), ` +
          `${upsideDelta > 0 ? "more" : upsideDelta < 0 ? "less" : "equal"} upside potential (+${a.estimated_upside}% vs +${b.estimated_upside}%). ` +
          `Decisive factor: ${decisiveFactor}.`;
        
        // Store comparison for audit
        await supabase.from("insight_comparisons").insert({
          user_id: user.id,
          brand_id: a.brand_id,
          insight_a_id: insightAId,
          insight_b_id: insightBId,
          comparison_explanation: explanation,
          severity_delta: severityDelta,
          confidence_delta: confidenceDelta,
          effort_advantage: effortAdvantage,
          upside_delta: upsideDelta,
          decisive_factor: decisiveFactor,
        });
        
        return new Response(
          JSON.stringify({
            comparison: {
              winner: a.priority_rank > b.priority_rank ? "a" : "b",
              explanation,
              decisiveFactor,
              metrics: {
                severityDelta,
                confidenceDelta,
                effortAdvantage,
                upsideDelta,
              },
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "updateStatus": {
        const { insightId, status } = params;
        
        const updateData: any = { status, updated_at: new Date().toISOString() };
        
        if (status === "acknowledged") {
          updateData.acknowledged_at = new Date().toISOString();
        } else if (status === "completed") {
          updateData.completed_at = new Date().toISOString();
        }
        
        const { error } = await supabase
          .from("prioritized_insights")
          .update(updateData)
          .eq("id", insightId)
          .eq("user_id", user.id);
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "getAllInsights": {
        const { brandId, status, limit = 20 } = params;
        
        let query = supabase
          .from("prioritized_insights")
          .select("*")
          .eq("user_id", user.id)
          .order("priority_rank", { ascending: false })
          .limit(limit);
        
        if (brandId) query = query.eq("brand_id", brandId);
        if (status) query = query.eq("status", status);
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ insights: data }),
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
    console.error("Insight prioritizer error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
