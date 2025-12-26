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
  priority: number;
}

interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Job type handlers
const JOB_HANDLERS: Record<string, (supabase: any, supabaseUrl: string, serviceKey: string, job: Job) => Promise<JobResult>> = {
  
  // Full analysis pipeline job
  analyze_prompt: async (supabase, supabaseUrl, serviceKey, job) => {
    const { prompt_id, prompt_text, brand, competitors, engines } = job.payload;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/analysis-pipeline`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt_text,
        promptId: prompt_id,
        brand,
        competitors,
        config: { engines },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Pipeline failed: ${await response.text()}`);
    }
    
    return { success: true, data: await response.json() };
  },

  // Multi-search job
  multi_search: async (supabase, supabaseUrl, serviceKey, job) => {
    const { query, country, includeReddit, includeQuora } = job.payload;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/multi-search`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, country, includeReddit, includeQuora }),
    });
    
    if (!response.ok) throw new Error(`Search failed: ${await response.text()}`);
    return { success: true, data: await response.json() };
  },

  // AI answer generation job
  generate_ai_answer: async (supabase, supabaseUrl, serviceKey, job) => {
    const { query, searchContext, styles, preferredModel } = job.payload;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-answer-generator`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, searchContext, styles, preferredModel }),
    });
    
    if (!response.ok) throw new Error(`Generation failed: ${await response.text()}`);
    return { success: true, data: await response.json() };
  },

  // Prompt classification job
  classify_prompts: async (supabase, supabaseUrl, serviceKey, job) => {
    const { prompts, useLLM } = job.payload;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/prompt-classifier`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompts, useLLM }),
    });
    
    if (!response.ok) throw new Error(`Classification failed: ${await response.text()}`);
    return { success: true, data: await response.json() };
  },

  // Citation verification job
  verify_citation: async (supabase, supabaseUrl, serviceKey, job) => {
    const { sourceUrl, claimText } = job.payload;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/verify-citation`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sourceUrl, claimText }),
    });
    
    if (!response.ok) throw new Error(`Verification failed: ${await response.text()}`);
    return { success: true, data: await response.json() };
  },

  // Scoring job
  calculate_scores: async (supabase, supabaseUrl, serviceKey, job) => {
    const { promptId, engineResults, totalCitations, brandCitations, competitorMentions } = job.payload;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/scoring-engine`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ promptId, engineResults, totalCitations, brandCitations, competitorMentions, storeResult: true }),
    });
    
    if (!response.ok) throw new Error(`Scoring failed: ${await response.text()}`);
    return { success: true, data: await response.json() };
  },

  // Report generation job
  generate_report: async (supabase, supabaseUrl, serviceKey, job) => {
    const { reportType, brandId, dateRange } = job.payload;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-report`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reportType, brandId, dateRange }),
    });
    
    if (!response.ok) throw new Error(`Report generation failed: ${await response.text()}`);
    return { success: true, data: await response.json() };
  },

  // Batch analysis job
  batch_analysis: async (supabase, supabaseUrl, serviceKey, job) => {
    const { prompts, brand, competitors, config } = job.payload;
    const results = [];
    
    for (const prompt of prompts) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/analysis-pipeline`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt: prompt.text, promptId: prompt.id, brand, competitors, config }),
        });
        
        if (response.ok) {
          results.push({ promptId: prompt.id, success: true, data: await response.json() });
        } else {
          results.push({ promptId: prompt.id, success: false, error: await response.text() });
        }
      } catch (error) {
        results.push({ promptId: prompt.id, success: false, error: String(error) });
      }
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return { success: true, data: { results, total: prompts.length, successful: results.filter(r => r.success).length } };
  },
};

// Process a single job
async function processJob(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  job: Job
): Promise<{ success: boolean; result?: any; error?: string }> {
  const handler = JOB_HANDLERS[job.job_type];
  
  if (!handler) {
    return { success: false, error: `Unknown job type: ${job.job_type}` };
  }
  
  try {
    const result = await handler(supabase, supabaseUrl, serviceKey, job);
    return { success: true, result: result.data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Move job to dead-letter queue
async function moveToDeadLetter(supabase: any, job: Job, error: string): Promise<void> {
  await supabase
    .from("job_queue")
    .update({
      status: "dead_letter",
      error_message: error,
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  
  console.log(`Job ${job.id} moved to dead-letter queue: ${error}`);
}

// Complete job successfully
async function completeJob(supabase: any, job: Job, result: any): Promise<void> {
  await supabase
    .from("job_queue")
    .update({
      status: "completed",
      result,
      completed_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  
  console.log(`Job ${job.id} completed successfully`);
}

// Retry job with exponential backoff
async function retryJob(supabase: any, job: Job, error: string): Promise<void> {
  const backoffMinutes = Math.pow(2, job.retry_count);
  const nextRun = new Date(Date.now() + backoffMinutes * 60 * 1000);
  
  await supabase
    .from("job_queue")
    .update({
      status: "pending",
      retry_count: job.retry_count + 1,
      error_message: error,
      scheduled_for: nextRun.toISOString(),
    })
    .eq("id", job.id);
  
  console.log(`Job ${job.id} scheduled for retry at ${nextRun.toISOString()}`);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, jobTypes, batchSize = 5 } = await req.json();

    if (action === "process") {
      // Fetch pending jobs
      let query = supabase
        .from("job_queue")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_for", new Date().toISOString())
        .order("priority", { ascending: false })
        .order("scheduled_for", { ascending: true })
        .limit(batchSize);
      
      if (jobTypes && jobTypes.length > 0) {
        query = query.in("job_type", jobTypes);
      }
      
      const { data: jobs, error: fetchError } = await query;
      
      if (fetchError) throw fetchError;
      if (!jobs || jobs.length === 0) {
        return new Response(
          JSON.stringify({ processed: 0, message: "No pending jobs" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`Processing ${jobs.length} jobs...`);
      
      const results = [];
      
      for (const job of jobs) {
        // Mark as processing
        await supabase
          .from("job_queue")
          .update({ status: "processing", started_at: new Date().toISOString() })
          .eq("id", job.id);
        
        const { success, result, error } = await processJob(supabase, supabaseUrl, serviceKey, job);
        
        if (success) {
          await completeJob(supabase, job, result);
          results.push({ jobId: job.id, status: "completed" });
        } else if (job.retry_count >= job.max_retries) {
          await moveToDeadLetter(supabase, job, error || "Max retries exceeded");
          results.push({ jobId: job.id, status: "dead_letter", error });
        } else {
          await retryJob(supabase, job, error || "Unknown error");
          results.push({ jobId: job.id, status: "retry_scheduled", error });
        }
      }

      return new Response(
        JSON.stringify({ processed: results.length, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "stats") {
      const { data: stats } = await supabase
        .from("job_queue")
        .select("status")
        .then((res: any) => {
          const counts: Record<string, number> = {};
          (res.data || []).forEach((j: any) => {
            counts[j.status] = (counts[j.status] || 0) + 1;
          });
          return { data: counts };
        });
      
      return new Response(
        JSON.stringify({ stats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "replay_dead_letter") {
      const { jobId } = await req.json();
      
      const { error } = await supabase
        .from("job_queue")
        .update({
          status: "pending",
          retry_count: 0,
          error_message: null,
          scheduled_for: new Date().toISOString(),
        })
        .eq("id", jobId)
        .eq("status", "dead_letter");
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ replayed: true, jobId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "cleanup") {
      const { olderThanDays = 30 } = await req.json();
      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      const { count, error } = await supabase
        .from("job_queue")
        .delete()
        .in("status", ["completed", "dead_letter"])
        .lt("completed_at", cutoff.toISOString());
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ deleted: count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: process, stats, replay_dead_letter, cleanup" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Job processor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
