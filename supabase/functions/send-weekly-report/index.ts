// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeeklyMetrics {
  totalPrompts: number;
  avgVisibility: number;
  topPrompt: { text: string; score: number } | null;
  worstPrompt: { text: string; score: number } | null;
  visibilityChange: number;
  competitors: Array<{ name: string; score: number; change: number }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.log("RESEND_API_KEY not configured, skipping email send");
      return new Response(
        JSON.stringify({ success: false, message: "Email service not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting weekly report generation...");

    // Get users with weekly reports enabled
    const { data: settings, error: settingsError } = await supabase
      .from("notification_settings")
      .select("user_id")
      .eq("weekly_report_enabled", true)
      .eq("email_enabled", true);

    if (settingsError) throw settingsError;

    const userIds = settings?.map((s) => s.user_id) || [];
    console.log(`Found ${userIds.length} users with weekly reports enabled`);

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users to send reports to" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, full_name")
      .in("user_id", userIds);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    for (const profile of profiles || []) {
      if (!profile.email) continue;

      console.log(`Generating report for user: ${profile.user_id}`);

      // Get user's primary brand
      const { data: brand } = await supabase
        .from("brands")
        .select("id, name")
        .eq("user_id", profile.user_id)
        .eq("is_primary", true)
        .maybeSingle();

      if (!brand) continue;

      // Get prompts from the last week
      const { data: prompts } = await supabase
        .from("prompts")
        .select("id, text, visibility_score")
        .eq("user_id", profile.user_id)
        .gte("created_at", oneWeekAgo.toISOString());

      // Get visibility history
      const { data: visibilityHistory } = await supabase
        .from("visibility_history")
        .select("visibility_score, recorded_at")
        .eq("user_id", profile.user_id)
        .gte("recorded_at", oneWeekAgo.toISOString())
        .order("recorded_at", { ascending: true });

      // Get competitors
      const { data: competitors } = await supabase
        .from("competitors")
        .select("name, last_visibility_score")
        .eq("user_id", profile.user_id)
        .eq("is_active", true)
        .limit(5);

      // Calculate metrics
      const totalPrompts = prompts?.length || 0;
      const avgVisibility =
        prompts && prompts.length > 0
          ? prompts.reduce((sum, p) => sum + (p.visibility_score || 0), 0) / prompts.length
          : 0;

      const sortedByScore = [...(prompts || [])].sort(
        (a, b) => (b.visibility_score || 0) - (a.visibility_score || 0)
      );
      const topPrompt = sortedByScore[0]
        ? { text: sortedByScore[0].text, score: sortedByScore[0].visibility_score || 0 }
        : null;
      const worstPrompt = sortedByScore[sortedByScore.length - 1]
        ? {
            text: sortedByScore[sortedByScore.length - 1].text,
            score: sortedByScore[sortedByScore.length - 1].visibility_score || 0,
          }
        : null;

      // Calculate visibility change
      let visibilityChange = 0;
      if (visibilityHistory && visibilityHistory.length >= 2) {
        const first = visibilityHistory[0].visibility_score;
        const last = visibilityHistory[visibilityHistory.length - 1].visibility_score;
        visibilityChange = last - first;
      }

      const metrics: WeeklyMetrics = {
        totalPrompts,
        avgVisibility: Math.round(avgVisibility * 10) / 10,
        topPrompt,
        worstPrompt,
        visibilityChange: Math.round(visibilityChange * 10) / 10,
        competitors:
          competitors?.map((c) => ({
            name: c.name,
            score: c.last_visibility_score || 0,
            change: 0,
          })) || [],
      };

      // Generate HTML email
      const emailHtml = generateWeeklyReportEmail(
        profile.full_name || "User",
        brand.name,
        metrics
      );

      // Send email
      try {
        const { error: emailError } = await resend.emails.send({
          from: "FORZEO <reports@resend.dev>",
          to: [profile.email],
          subject: `Weekly Visibility Report - ${brand.name}`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Failed to send email to ${profile.email}:`, emailError);
        } else {
          console.log(`Weekly report sent to ${profile.email}`);
        }
      } catch (emailErr) {
        console.error(`Error sending email to ${profile.email}:`, emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Sent reports to ${profiles?.length || 0} users` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-weekly-report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateWeeklyReportEmail(
  userName: string,
  brandName: string,
  metrics: WeeklyMetrics
): string {
  const changeColor = metrics.visibilityChange >= 0 ? "#10b981" : "#ef4444";
  const changeSymbol = metrics.visibilityChange >= 0 ? "↑" : "↓";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Visibility Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #ffffff; font-size: 28px; margin: 0;">FORZEO</h1>
      <p style="color: #6b7280; margin-top: 10px;">Weekly Visibility Report</p>
    </div>

    <!-- Greeting -->
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px; border: 1px solid #2d2d44;">
      <h2 style="color: #ffffff; margin: 0 0 10px 0;">Hi ${userName}!</h2>
      <p style="color: #9ca3af; margin: 0;">Here's your weekly visibility summary for <strong style="color: #8b5cf6;">${brandName}</strong></p>
    </div>

    <!-- Key Metrics -->
    <div style="display: flex; gap: 15px; margin-bottom: 20px;">
      <div style="flex: 1; background: #1a1a2e; border-radius: 12px; padding: 20px; border: 1px solid #2d2d44; text-align: center;">
        <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Average Visibility</p>
        <p style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0;">${metrics.avgVisibility}%</p>
        <p style="color: ${changeColor}; margin: 5px 0 0 0; font-size: 14px;">${changeSymbol} ${Math.abs(metrics.visibilityChange)}%</p>
      </div>
      <div style="flex: 1; background: #1a1a2e; border-radius: 12px; padding: 20px; border: 1px solid #2d2d44; text-align: center;">
        <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Prompts Tracked</p>
        <p style="color: #ffffff; font-size: 32px; font-weight: bold; margin: 0;">${metrics.totalPrompts}</p>
        <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">this week</p>
      </div>
    </div>

    <!-- Top & Worst Performing -->
    ${
      metrics.topPrompt
        ? `
    <div style="background: #1a1a2e; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #2d2d44;">
      <h3 style="color: #10b981; margin: 0 0 15px 0; font-size: 16px;">🏆 Top Performing Prompt</h3>
      <p style="color: #ffffff; margin: 0 0 10px 0;">"${metrics.topPrompt.text.substring(0, 100)}${metrics.topPrompt.text.length > 100 ? "..." : ""}"</p>
      <p style="color: #10b981; margin: 0; font-weight: bold;">${metrics.topPrompt.score}% visibility</p>
    </div>
    `
        : ""
    }

    ${
      metrics.worstPrompt && metrics.worstPrompt.score < 50
        ? `
    <div style="background: #1a1a2e; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #2d2d44;">
      <h3 style="color: #f59e0b; margin: 0 0 15px 0; font-size: 16px;">⚠️ Needs Improvement</h3>
      <p style="color: #ffffff; margin: 0 0 10px 0;">"${metrics.worstPrompt.text.substring(0, 100)}${metrics.worstPrompt.text.length > 100 ? "..." : ""}"</p>
      <p style="color: #f59e0b; margin: 0; font-weight: bold;">${metrics.worstPrompt.score}% visibility</p>
    </div>
    `
        : ""
    }

    <!-- Competitors -->
    ${
      metrics.competitors.length > 0
        ? `
    <div style="background: #1a1a2e; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #2d2d44;">
      <h3 style="color: #ffffff; margin: 0 0 15px 0; font-size: 16px;">📊 Competitor Snapshot</h3>
      ${metrics.competitors
        .map(
          (c) => `
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #2d2d44;">
          <span style="color: #9ca3af;">${c.name}</span>
          <span style="color: #ffffff; font-weight: bold;">${c.score}%</span>
        </div>
      `
        )
        .join("")}
    </div>
    `
        : ""
    }

    <!-- CTA -->
    <div style="text-align: center; margin-top: 30px;">
      <a href="${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovable.app") || "#"}" 
         style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
        View Full Dashboard
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #2d2d44;">
      <p style="color: #6b7280; font-size: 12px; margin: 0;">
        You're receiving this because you have weekly reports enabled.<br>
        <a href="#" style="color: #8b5cf6;">Manage preferences</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
