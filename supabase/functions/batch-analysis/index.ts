// @ts-nocheck - Deno types not available in IDE
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PERSONAS = ["General User", "CTO", "Developer", "Student", "Investor", "Manager"];
const MODELS = ["ChatGPT", "Gemini", "Claude", "Perplexity"];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, promptIds, personas = PERSONAS, brandName, scheduleId, sendEmail = true } = await req.json();

    if (!userId || !promptIds || !brandName) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting batch analysis for user ${userId} with ${promptIds.length} prompts and ${personas.length} personas`);

    // Fetch prompts
    const { data: prompts, error: promptsError } = await supabase
      .from("prompts")
      .select("*")
      .in("id", promptIds);

    if (promptsError) throw promptsError;

    const results: any[] = [];
    let wins = 0;
    let losses = 0;
    let totalAccuracy = 0;
    let accuracyCount = 0;

    for (const prompt of prompts || []) {
      for (const persona of personas) {
        const model = MODELS[Math.floor(Math.random() * MODELS.length)];

        // Create analysis job with 'scraping' status
        const { data: job, error: jobError } = await supabase
          .from("analysis_jobs")
          .insert({
            user_id: userId,
            prompt_id: prompt.id,
            prompt_text: prompt.text,
            model,
            persona,
            phase: "scraping",
          })
          .select()
          .single();

        if (jobError) {
          console.error("Failed to create job:", jobError);
          continue;
        }

        console.log(`Created job ${job.id} for prompt "${prompt.text}" with persona ${persona}`);

        // Simulate phase progression
        const phases = ["scraping", "thinking", "judging"];
        for (const phase of phases) {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          await supabase
            .from("analysis_jobs")
            .update({ phase })
            .eq("id", job.id);
        }

        // Call analyze-prompt function
        try {
          const analysisResponse = await fetch(`${supabaseUrl}/functions/v1/analyze-prompt`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${supabaseServiceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: prompt.text,
              brand: brandName,
              persona,
            }),
          });

          if (analysisResponse.ok) {
            const analysisResult = await analysisResponse.json();
            
            // Update job with results
            await supabase
              .from("analysis_jobs")
              .update({
                phase: "complete",
                brand_mentioned: analysisResult.brand_mentioned,
                sentiment: analysisResult.sentiment,
                accuracy: analysisResult.accuracy,
                reasoning: analysisResult.reasoning,
                completed_at: new Date().toISOString(),
              })
              .eq("id", job.id);

            // Track stats
            if (analysisResult.brand_mentioned) {
              wins++;
            } else {
              losses++;
            }
            
            if (analysisResult.accuracy) {
              totalAccuracy += analysisResult.accuracy;
              accuracyCount++;
            }

            results.push({
              jobId: job.id,
              promptId: prompt.id,
              persona,
              model,
              ...analysisResult,
            });
          } else {
            await supabase
              .from("analysis_jobs")
              .update({ phase: "failed" })
              .eq("id", job.id);
            losses++;
          }
        } catch (error) {
          console.error("Analysis error:", error);
          await supabase
            .from("analysis_jobs")
            .update({ phase: "failed" })
            .eq("id", job.id);
          losses++;
        }
      }
    }

    console.log(`Batch analysis complete: ${results.length} jobs processed, ${wins} wins, ${losses} losses`);

    // Update schedule last run time if scheduleId provided
    if (scheduleId) {
      await supabase
        .from("scheduled_reports")
        .update({ last_run_at: new Date().toISOString() })
        .eq("id", scheduleId);
    }

    // Send email notification if enabled
    if (sendEmail && results.length > 0) {
      try {
        console.log("Sending analysis complete email notification...");
        
        await fetch(`${supabaseUrl}/functions/v1/send-alert-email`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            alertType: "analysis_complete",
            data: {
              brandName,
              totalAnalyses: results.length,
              wins,
              losses,
              personas,
              avgAccuracy: accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : null,
              scheduleType: scheduleId ? "scheduled" : "manual",
            },
          }),
        });
        
        console.log("Email notification sent successfully");
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results, 
        totalJobs: results.length,
        wins,
        losses,
        avgAccuracy: accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in batch-analysis:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
