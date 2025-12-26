// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting scheduled prompt analysis...");

    // Get all users with prompts
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("user_id, email");

    if (usersError) throw usersError;

    for (const user of users || []) {
      console.log(`Processing user: ${user.user_id}`);

      // Get user's notification settings
      const { data: settings } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.user_id)
        .maybeSingle();

      const visibilityThreshold = settings?.visibility_threshold || 70;

      // Get user's primary brand
      const { data: brand } = await supabase
        .from("brands")
        .select("*")
        .eq("user_id", user.user_id)
        .eq("is_primary", true)
        .maybeSingle();

      if (!brand) continue;

      // Get user's prompts
      const { data: prompts } = await supabase
        .from("prompts")
        .select("*")
        .eq("user_id", user.user_id)
        .limit(10);

      if (!prompts || prompts.length === 0) continue;

      // Analyze each prompt
      for (const prompt of prompts) {
        const previousScore = prompt.visibility_score || 0;

        // Call analyze-prompt function
        const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-prompt`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: prompt.text,
            brand: brand.name,
          }),
        });

        if (!analysisResponse.ok) {
          console.error(`Failed to analyze prompt ${prompt.id}`);
          continue;
        }

        const analysisResult = await analysisResponse.json();
        const newScore = analysisResult.overall_visibility_score || 0;

        // Update prompt visibility score
        await supabase
          .from("prompts")
          .update({ visibility_score: newScore })
          .eq("id", prompt.id);

        // Record visibility history
        await supabase.from("visibility_history").insert({
          user_id: user.user_id,
          brand_id: brand.id,
          prompt_id: prompt.id,
          visibility_score: newScore,
        });

        // Check for visibility drop alert
        if (settings?.visibility_drop_alert && settings?.email_enabled) {
          if (previousScore >= visibilityThreshold && newScore < visibilityThreshold) {
            console.log(`Visibility drop detected for user ${user.user_id}`);
            
            // Send alert email
            await fetch(`${supabaseUrl}/functions/v1/send-alert-email`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                userId: user.user_id,
                alertType: "visibility_drop",
                data: {
                  brandName: brand.name,
                  currentScore: newScore,
                  previousScore,
                  threshold: visibilityThreshold,
                  promptText: prompt.text,
                },
              }),
            });
          }
        }

        // Check competitors
        if (settings?.competitor_overtake_alert && settings?.email_enabled) {
          const { data: competitors } = await supabase
            .from("competitors")
            .select("*")
            .eq("user_id", user.user_id)
            .eq("is_active", true);

          for (const competitor of competitors || []) {
            // Analyze competitor visibility
            const competitorResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-prompt`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prompt: prompt.text,
                brand: competitor.name,
              }),
            });

            if (competitorResponse.ok) {
              const competitorResult = await competitorResponse.json();
              const competitorScore = competitorResult.overall_visibility_score || 0;
              const previousCompetitorScore = competitor.last_visibility_score || 0;

              // Update competitor tracking
              await supabase
                .from("competitors")
                .update({ last_visibility_score: competitorScore })
                .eq("id", competitor.id);

              // Check if competitor overtook our brand
              if (previousCompetitorScore < previousScore && competitorScore > newScore) {
                console.log(`Competitor ${competitor.name} overtook ${brand.name}`);
                
                await fetch(`${supabaseUrl}/functions/v1/send-alert-email`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${supabaseServiceKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    userId: user.user_id,
                    alertType: "competitor_overtake",
                    data: {
                      brandName: brand.name,
                      competitorName: competitor.name,
                      yourRank: newScore,
                      competitorRank: competitorScore,
                      promptText: prompt.text,
                    },
                  }),
                });
              }
            }
          }
        }
      }
    }

    console.log("Scheduled analysis complete");

    return new Response(
      JSON.stringify({ success: true, message: "Scheduled analysis complete" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in scheduled-analysis:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
