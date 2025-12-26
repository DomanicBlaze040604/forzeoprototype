// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cost estimates per API call (in USD)
const API_COSTS: Record<string, Record<string, number>> = {
  "serper": { search: 0.001 },
  "bing": { search: 0.0005 },
  "gemini": { generate: 0.00015, classify: 0.0001 },
  "groq": { generate: 0, classify: 0 }, // Free tier
  "multi-search": { search: 0.002 },
  "ai-answer-generator": { generate: 0.003 },
  "mention-detector": { detect: 0.0005 },
  "scoring-engine": { score: 0.0001 },
  "prompt-classifier": { classify: 0.0002 },
  "citation-verifier": { verify: 0.001 },
};

interface UsageSummary {
  daily: { cost: number; calls: number; byApi: Record<string, number> };
  monthly: { cost: number; calls: number; byApi: Record<string, number> };
  limits: { daily: number; monthly: number; alertThreshold: number };
  alerts: { dailyWarning: boolean; monthlyWarning: boolean; dailyExceeded: boolean; monthlyExceeded: boolean };
}

// Get cost estimate for an API call
function getCostEstimate(apiName: string, action: string): number {
  return API_COSTS[apiName]?.[action] || 0.0001;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

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

    const { action } = await req.json();

    if (action === "track") {
      const { apiName, apiAction, responseTimeMs, success, errorMessage } = await req.json();
      const costEstimate = getCostEstimate(apiName, apiAction);
      
      await supabase.from("api_usage").insert({
        user_id: user.id,
        api_name: apiName,
        action: apiAction,
        cost_estimate: costEstimate,
        response_time_ms: responseTimeMs,
        success,
        error_message: errorMessage,
      });
      
      return new Response(
        JSON.stringify({ tracked: true, cost: costEstimate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "summary") {
      // Get daily usage
      const today = new Date().toISOString().split("T")[0];
      const { data: dailyUsage } = await supabase
        .from("api_usage")
        .select("api_name, cost_estimate")
        .eq("user_id", user.id)
        .gte("created_at", `${today}T00:00:00Z`);
      
      // Get monthly usage
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { data: monthlyUsage } = await supabase
        .from("api_usage")
        .select("api_name, cost_estimate")
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString());
      
      // Get limits
      const { data: limits } = await supabase
        .from("cost_alerts")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      const dailyLimit = limits?.daily_limit || 10;
      const monthlyLimit = limits?.monthly_limit || 100;
      const alertThreshold = limits?.alert_threshold_percent || 80;
      
      // Calculate totals
      const dailyCost = (dailyUsage || []).reduce((sum, u) => sum + (u.cost_estimate || 0), 0);
      const monthlyCost = (monthlyUsage || []).reduce((sum, u) => sum + (u.cost_estimate || 0), 0);
      
      // Group by API
      const dailyByApi: Record<string, number> = {};
      const monthlyByApi: Record<string, number> = {};
      
      for (const u of dailyUsage || []) {
        dailyByApi[u.api_name] = (dailyByApi[u.api_name] || 0) + (u.cost_estimate || 0);
      }
      for (const u of monthlyUsage || []) {
        monthlyByApi[u.api_name] = (monthlyByApi[u.api_name] || 0) + (u.cost_estimate || 0);
      }
      
      const summary: UsageSummary = {
        daily: { cost: dailyCost, calls: dailyUsage?.length || 0, byApi: dailyByApi },
        monthly: { cost: monthlyCost, calls: monthlyUsage?.length || 0, byApi: monthlyByApi },
        limits: { daily: dailyLimit, monthly: monthlyLimit, alertThreshold },
        alerts: {
          dailyWarning: dailyCost >= dailyLimit * (alertThreshold / 100),
          monthlyWarning: monthlyCost >= monthlyLimit * (alertThreshold / 100),
          dailyExceeded: dailyCost >= dailyLimit,
          monthlyExceeded: monthlyCost >= monthlyLimit,
        },
      };
      
      return new Response(
        JSON.stringify(summary),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "setLimits") {
      const { dailyLimit, monthlyLimit, alertThreshold, emailOnThreshold } = await req.json();
      
      await supabase.from("cost_alerts").upsert({
        user_id: user.id,
        daily_limit: dailyLimit || 10,
        monthly_limit: monthlyLimit || 100,
        alert_threshold_percent: alertThreshold || 80,
        email_on_threshold: emailOnThreshold ?? true,
        updated_at: new Date().toISOString(),
      });
      
      return new Response(
        JSON.stringify({ updated: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "history") {
      const { days = 30, limit = 1000 } = await req.json();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data: history } = await supabase
        .from("api_usage")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(limit);
      
      return new Response(
        JSON.stringify({ history: history || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: track, summary, setLimits, history" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cost tracker error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
