// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * SLA Enforcer - Scheduled job to detect and escalate overdue insights
 * 
 * This function should be called periodically (e.g., every hour via cron)
 * to check for insights that have exceeded their SLA deadlines.
 */

interface OverdueInsight {
  id: string;
  title: string;
  assigned_to: string | null;
  deadline: string;
  sla_hours: number | null;
  hours_overdue: number;
  user_id: string;
  brand_id: string | null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action } = await req.json();

    switch (action) {
      // ========================================================================
      // CHECK OVERDUE: Find all insights past their deadline
      // ========================================================================
      case "checkOverdue": {
        const now = new Date().toISOString();
        
        // Find insights with deadlines that have passed
        const { data: overdueInsights, error } = await supabase
          .from("prioritized_insights")
          .select("id, title, assigned_to, deadline, sla_hours, user_id, brand_id, status")
          .lt("deadline", now)
          .in("status", ["pending", "acknowledged", "in_progress"])
          .not("deadline", "is", null);
        
        if (error) throw error;
        
        const results: OverdueInsight[] = (overdueInsights || []).map((insight: any) => {
          const deadline = new Date(insight.deadline);
          const hoursOverdue = Math.round((Date.now() - deadline.getTime()) / (1000 * 60 * 60));
          
          return {
            id: insight.id,
            title: insight.title,
            assigned_to: insight.assigned_to,
            deadline: insight.deadline,
            sla_hours: insight.sla_hours,
            hours_overdue: hoursOverdue,
            user_id: insight.user_id,
            brand_id: insight.brand_id,
          };
        });
        
        return new Response(
          JSON.stringify({
            overdueCount: results.length,
            insights: results,
            checkedAt: now,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // ESCALATE: Mark overdue insights and create notifications
      // ========================================================================
      case "escalate": {
        const now = new Date().toISOString();
        
        // Find overdue insights
        const { data: overdueInsights } = await supabase
          .from("prioritized_insights")
          .select("id, title, assigned_to, deadline, sla_hours, user_id, brand_id, status, overdue")
          .lt("deadline", now)
          .in("status", ["pending", "acknowledged", "in_progress"])
          .eq("overdue", false)
          .not("deadline", "is", null);
        
        if (!overdueInsights || overdueInsights.length === 0) {
          return new Response(
            JSON.stringify({ escalated: 0, message: "No new overdue insights" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const escalatedIds: string[] = [];
        
        for (const insight of overdueInsights) {
          // Mark as overdue
          await supabase
            .from("prioritized_insights")
            .update({ 
              overdue: true,
              updated_at: now,
            })
            .eq("id", insight.id);
          
          // Create system notification
          await supabase.from("system_notifications").insert({
            notification_type: "sla_breach",
            title: "SLA Deadline Missed",
            message: `Insight "${insight.title}" has exceeded its deadline`,
            severity: "warning",
            metadata: {
              insight_id: insight.id,
              assigned_to: insight.assigned_to,
              deadline: insight.deadline,
              sla_hours: insight.sla_hours,
            },
            auto_dismiss_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
          
          escalatedIds.push(insight.id);
        }
        
        return new Response(
          JSON.stringify({
            escalated: escalatedIds.length,
            insightIds: escalatedIds,
            escalatedAt: now,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // GET STATS: SLA compliance statistics
      // ========================================================================
      case "getStats": {
        const { days = 30 } = await req.json();
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        
        // Get all insights with deadlines in the period
        const { data: insights } = await supabase
          .from("prioritized_insights")
          .select("id, status, deadline, completed_at, overdue")
          .not("deadline", "is", null)
          .gte("created_at", startDate);
        
        const total = insights?.length || 0;
        const completed = insights?.filter(i => i.status === "completed").length || 0;
        const overdue = insights?.filter(i => i.overdue).length || 0;
        const onTime = insights?.filter(i => 
          i.status === "completed" && 
          i.completed_at && 
          i.deadline && 
          new Date(i.completed_at) <= new Date(i.deadline)
        ).length || 0;
        
        const complianceRate = total > 0 ? Math.round((onTime / total) * 100) : 100;
        
        return new Response(
          JSON.stringify({
            periodDays: days,
            totalWithSLA: total,
            completed,
            completedOnTime: onTime,
            overdue,
            complianceRate,
            message: complianceRate >= 80 
              ? "Good SLA compliance" 
              : complianceRate >= 50 
              ? "SLA compliance needs improvement"
              : "Critical: Low SLA compliance",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // RUN ENFORCEMENT: Combined check + escalate (for cron jobs)
      // ========================================================================
      case "runEnforcement": {
        const now = new Date().toISOString();
        
        // Find and escalate overdue insights
        const { data: overdueInsights } = await supabase
          .from("prioritized_insights")
          .select("id, title, assigned_to, deadline, user_id")
          .lt("deadline", now)
          .in("status", ["pending", "acknowledged", "in_progress"])
          .eq("overdue", false)
          .not("deadline", "is", null);
        
        let escalatedCount = 0;
        
        for (const insight of overdueInsights || []) {
          await supabase
            .from("prioritized_insights")
            .update({ overdue: true, updated_at: now })
            .eq("id", insight.id);
          
          await supabase.from("system_notifications").insert({
            notification_type: "sla_breach",
            title: "SLA Deadline Missed",
            message: `Insight "${insight.title}" has exceeded its deadline`,
            severity: "warning",
            metadata: { insight_id: insight.id },
            auto_dismiss_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
          
          escalatedCount++;
        }
        
        console.log(`SLA Enforcement: ${escalatedCount} insights escalated at ${now}`);
        
        return new Response(
          JSON.stringify({
            success: true,
            escalated: escalatedCount,
            runAt: now,
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
    console.error("SLA enforcer error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
