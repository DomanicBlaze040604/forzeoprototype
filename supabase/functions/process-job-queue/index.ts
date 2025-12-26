// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Job {
  id: string;
  user_id: string;
  job_type: string;
  status: string;
  payload: Record<string, any>;
  retry_count: number;
  max_retries: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { batchSize = 10 } = await req.json().catch(() => ({}));

    console.log(`Processing job queue, batch size: ${batchSize}`);

    // Get pending jobs
    const { data: jobs, error: fetchError } = await supabase
      .from("job_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("scheduled_for", { ascending: true })
      .limit(batchSize);

    if (fetchError) throw fetchError;

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending jobs", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${jobs.length} pending jobs`);

    const results: Array<{ jobId: string; status: string; error?: string }> = [];

    for (const job of jobs as Job[]) {
      // Mark as processing
      await supabase
        .from("job_queue")
        .update({ status: "processing", started_at: new Date().toISOString() })
        .eq("id", job.id);

      try {
        let result: any;

        switch (job.job_type) {
          case "analyze_prompt":
            result = await processAnalyzePrompt(supabase, supabaseUrl, supabaseServiceKey, job);
            break;
          case "verify_citation":
            result = await processVerifyCitation(supabase, supabaseUrl, supabaseServiceKey, job);
            break;
          case "dataforseo_llm_scraper":
            result = await processDataForSEOLLMScraper(supabase, supabaseUrl, supabaseServiceKey, job);
            break;
          case "dataforseo_google_ai_mode":
            result = await processDataForSEOGoogleAIMode(supabase, supabaseUrl, supabaseServiceKey, job);
            break;
          case "send_alert":
            result = await processSendAlert(supabase, supabaseUrl, supabaseServiceKey, job);
            break;
          default:
            throw new Error(`Unknown job type: ${job.job_type}`);
        }

        // Mark as completed
        await supabase
          .from("job_queue")
          .update({
            status: "completed",
            result,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        results.push({ jobId: job.id, status: "completed" });
        console.log(`Job ${job.id} completed successfully`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`Job ${job.id} failed:`, errorMessage);

        // Check if should retry or move to dead letter
        if (job.retry_count < job.max_retries) {
          // Retry with exponential backoff
          const backoffMinutes = Math.pow(2, job.retry_count) * 5;
          const nextRetry = new Date(Date.now() + backoffMinutes * 60 * 1000);

          await supabase
            .from("job_queue")
            .update({
              status: "pending",
              retry_count: job.retry_count + 1,
              scheduled_for: nextRetry.toISOString(),
              error_message: errorMessage,
            })
            .eq("id", job.id);

          results.push({ jobId: job.id, status: "retry_scheduled", error: errorMessage });
        } else {
          // Move to dead letter queue
          await supabase
            .from("job_queue")
            .update({
              status: "dead_letter",
              error_message: errorMessage,
              completed_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          results.push({ jobId: job.id, status: "dead_letter", error: errorMessage });

          // Create alert for dead letter job
          await supabase.from("alerts").insert({
            user_id: job.user_id,
            type: "visibility_change",
            title: "Job Failed",
            message: `Job ${job.job_type} failed after ${job.max_retries} retries: ${errorMessage}`,
            severity: "warning",
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${results.length} jobs`,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Job queue processor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Job Processors

async function processAnalyzePrompt(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  job: Job
) {
  const { prompt_id, prompt_text, engine, persona } = job.payload;

  const response = await fetch(`${supabaseUrl}/functions/v1/analyze-prompt`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt_text,
      brand: job.payload.brand_name || "Brand",
      models: engine ? [engine] : undefined,
      persona,
    }),
  });

  if (!response.ok) {
    throw new Error(`Analyze prompt failed: ${response.status}`);
  }

  const result = await response.json();

  // Store engine-specific result if prompt_id provided
  if (prompt_id && engine) {
    await supabase.from("engine_results").insert({
      prompt_id,
      engine,
      raw_response: result,
      parsed_response: result.results?.[0] || null,
      brand_mentioned: result.results?.[0]?.brand_mentioned || false,
      brand_position: result.results?.[0]?.rank || null,
      citations: result.results?.[0]?.citations || [],
      sentiment: result.results?.[0]?.sentiment || null,
      confidence_score: result.overall_accuracy || null,
    });
  }

  return result;
}

async function processVerifyCitation(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  job: Job
) {
  const { source_url, claim_text } = job.payload;

  const response = await fetch(`${supabaseUrl}/functions/v1/verify-citation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sourceUrl: source_url, claimText: claim_text }),
  });

  if (!response.ok) {
    throw new Error(`Verify citation failed: ${response.status}`);
  }

  return response.json();
}

async function processDataForSEOLLMScraper(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  job: Job
) {
  const { prompts, task_id, action } = job.payload;

  const response = await fetch(`${supabaseUrl}/functions/v1/dataforseo-client`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: action || (task_id ? "llm_scraper_get" : "llm_scraper_post"),
      prompts,
      taskId: task_id,
    }),
  });

  if (!response.ok) {
    throw new Error(`DataForSEO LLM Scraper failed: ${response.status}`);
  }

  return response.json();
}

async function processDataForSEOGoogleAIMode(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  job: Job
) {
  const { queries, task_id, action } = job.payload;

  const response = await fetch(`${supabaseUrl}/functions/v1/dataforseo-client`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: action || (task_id ? "google_ai_mode_get" : "google_ai_mode_post"),
      queries,
      taskId: task_id,
    }),
  });

  if (!response.ok) {
    throw new Error(`DataForSEO Google AI Mode failed: ${response.status}`);
  }

  return response.json();
}

async function processSendAlert(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  job: Job
) {
  const { alert_type, data } = job.payload;

  const response = await fetch(`${supabaseUrl}/functions/v1/send-alert-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: job.user_id,
      alertType: alert_type,
      data,
    }),
  });

  if (!response.ok) {
    throw new Error(`Send alert failed: ${response.status}`);
  }

  return response.json();
}
