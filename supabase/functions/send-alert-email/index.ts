// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertEmailRequest {
  userId: string;
  alertType: "visibility_drop" | "competitor_overtake" | "sentiment_shift" | "analysis_complete";
  data: {
    brandName?: string;
    currentScore?: number;
    previousScore?: number;
    threshold?: number;
    competitorName?: string;
    competitorRank?: number;
    yourRank?: number;
    promptText?: string;
    // Analysis complete fields
    totalAnalyses?: number;
    wins?: number;
    losses?: number;
    personas?: string[];
    avgAccuracy?: number;
    scheduleType?: string;
  };
}

const getEmailContent = (alertType: string, data: any): { subject: string; html: string } => {
  switch (alertType) {
    case "visibility_drop":
      return {
        subject: `⚠️ Visibility Alert: ${data.brandName} dropped below ${data.threshold}%`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px; color: white;">
              <h1 style="margin: 0 0 20px; font-size: 24px;">⚠️ Visibility Drop Alert</h1>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Your brand <strong>${data.brandName}</strong> has dropped below your visibility threshold.
              </p>
              <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #888;">Previous Score:</span>
                  <span style="font-weight: bold;">${data.previousScore}%</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #888;">Current Score:</span>
                  <span style="font-weight: bold; color: #ef4444;">${data.currentScore}%</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #888;">Threshold:</span>
                  <span style="font-weight: bold;">${data.threshold}%</span>
                </div>
              </div>
              <p style="font-size: 14px; color: #888;">
                Prompt: "${data.promptText}"
              </p>
              <a href="https://forzeo.lovable.app" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px;">
                View Dashboard
              </a>
            </div>
          </div>
        `,
      };

    case "competitor_overtake":
      return {
        subject: `🔔 Competitor Alert: ${data.competitorName} has overtaken ${data.brandName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px; color: white;">
              <h1 style="margin: 0 0 20px; font-size: 24px;">🔔 Competitor Overtake Alert</h1>
              <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>${data.competitorName}</strong> has overtaken <strong>${data.brandName}</strong> in AI model rankings.
              </p>
              <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #888;">${data.competitorName} Rank:</span>
                  <span style="font-weight: bold; color: #22c55e;">#${data.competitorRank}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #888;">${data.brandName} Rank:</span>
                  <span style="font-weight: bold; color: #ef4444;">#${data.yourRank}</span>
                </div>
              </div>
              <p style="font-size: 14px; color: #888;">
                Prompt: "${data.promptText}"
              </p>
              <a href="https://forzeo.lovable.app" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 20px;">
                View Dashboard
              </a>
            </div>
          </div>
        `,
      };

    case "analysis_complete":
      const winRate = data.totalAnalyses > 0 ? Math.round((data.wins / data.totalAnalyses) * 100) : 0;
      return {
        subject: `✅ Analysis Complete: ${data.wins}/${data.totalAnalyses} brand mentions for ${data.brandName}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px; color: white;">
              <h1 style="margin: 0 0 20px; font-size: 24px;">✅ Scheduled Analysis Complete</h1>
              <p style="font-size: 16px; margin-bottom: 20px;">
                Your ${data.scheduleType || 'scheduled'} analysis for <strong>${data.brandName}</strong> has completed.
              </p>
              <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #888;">Total Analyses:</span>
                  <span style="font-weight: bold;">${data.totalAnalyses}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #888;">Brand Mentions (Wins):</span>
                  <span style="font-weight: bold; color: #22c55e;">${data.wins}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #888;">Not Mentioned (Losses):</span>
                  <span style="font-weight: bold; color: #ef4444;">${data.losses}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span style="color: #888;">Win Rate:</span>
                  <span style="font-weight: bold; color: ${winRate >= 50 ? '#22c55e' : '#f59e0b'};">${winRate}%</span>
                </div>
                ${data.avgAccuracy ? `
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #888;">Avg Accuracy:</span>
                  <span style="font-weight: bold;">${data.avgAccuracy}%</span>
                </div>
                ` : ''}
              </div>
              ${data.personas && data.personas.length > 0 ? `
              <p style="font-size: 14px; color: #888; margin-bottom: 20px;">
                Personas analyzed: ${data.personas.join(', ')}
              </p>
              ` : ''}
              <a href="https://forzeo.lovable.app/war-room" style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">
                View War Room
              </a>
              <a href="https://forzeo.lovable.app/improve" style="display: inline-block; background: transparent; border: 1px solid #7c3aed; color: #7c3aed; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px; margin-left: 10px;">
                View Reports
              </a>
            </div>
          </div>
        `,
      };

    default:
      return {
        subject: "FORZEO Alert Notification",
        html: `<p>You have a new alert. Please check your dashboard.</p>`,
      };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, alertType, data }: AlertEmailRequest = await req.json();

    console.log("Processing alert email:", { userId, alertType, data });

    // Get user email from profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError || !profile?.email) {
      console.error("Could not find user email:", profileError);
      return new Response(
        JSON.stringify({ error: "User email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = getEmailContent(alertType, data);

    const emailResponse = await resend.emails.send({
      from: "FORZEO Alerts <onboarding@resend.dev>",
      to: [profile.email],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    // Create an alert record in the database
    let alertMessage = "";
    let alertSeverity = "info";
    
    if (alertType === "visibility_drop") {
      alertMessage = `${data.brandName}: Score changed from ${data.previousScore}% to ${data.currentScore}%`;
      alertSeverity = "warning";
    } else if (alertType === "competitor_overtake") {
      alertMessage = `${data.competitorName} has overtaken ${data.brandName}`;
      alertSeverity = "warning";
    } else if (alertType === "analysis_complete") {
      alertMessage = `Analysis complete: ${data.wins}/${data.totalAnalyses} brand mentions`;
      alertSeverity = "success";
    }

    await supabase.from("alerts").insert({
      user_id: userId,
      type: alertType,
      title: subject.replace(/[⚠️🔔✅]/g, "").trim(),
      message: alertMessage,
      severity: alertSeverity,
      data,
    });

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-alert-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
