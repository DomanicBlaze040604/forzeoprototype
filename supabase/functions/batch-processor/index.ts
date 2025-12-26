// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cost estimates per operation type
const COST_PER_OPERATION: Record<string, number> = {
  prompt_analysis: 0.005,
  score_recalc: 0.001,
  citation_verify: 0.002,
  authority_update: 0.0005,
  engine_query: 0.003,
};

// Max batch sizes for different operations
const MAX_BATCH_SIZE: Record<string, number> = {
  prompt_analysis: 1000,
  score_recalc: 5000,
  citation_verify: 2000,
  authority_update: 10000,
};

interface BatchSubmission {
  batchType: string;
  jobs: Array<Record<string, any>>;
  priority?: number;
  scheduledFor?: string;
}

interface BatchStatus {
  id: string;
  status: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  progressPercentage: number;
  estimatedCost: number;
  actualCost: number;
  estimatedCompletion?: string;
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

    // Get user's organization
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();
    
    const organizationId = orgMember?.organization_id;

    switch (action) {
      // ========================================================================
      // SUBMIT BATCH: Create a batch of jobs with budget check
      // ========================================================================
      case "submitBatch": {
        const { batchType, jobs, priority = 5, scheduledFor } = params as BatchSubmission;
        
        if (!batchType || !jobs || !Array.isArray(jobs)) {
          return new Response(
            JSON.stringify({ error: "batchType and jobs array required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Validate batch size
        const maxSize = MAX_BATCH_SIZE[batchType] || 1000;
        if (jobs.length > maxSize) {
          return new Response(
            JSON.stringify({ 
              error: `Batch size exceeds maximum of ${maxSize} for ${batchType}`,
              maxSize,
              submitted: jobs.length,
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Estimate cost
        const costPerJob = COST_PER_OPERATION[batchType] || 0.003;
        const estimatedCost = jobs.length * costPerJob;
        
        // Check budget
        if (organizationId) {
          const { data: budgetCheck } = await supabase.rpc("check_budget_limit", {
            p_organization_id: organizationId,
            p_estimated_cost: estimatedCost,
          });
          
          if (budgetCheck && !budgetCheck[0]?.allowed) {
            return new Response(
              JSON.stringify({
                error: "Budget limit exceeded",
                reason: budgetCheck[0]?.reason,
                currentUsage: budgetCheck[0]?.current_usage,
                limit: budgetCheck[0]?.limit_amount,
                usagePercentage: budgetCheck[0]?.usage_percentage,
              }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        
        // Submit batch
        const { data: batchId, error: batchError } = await supabase.rpc("submit_batch_jobs", {
          p_user_id: user.id,
          p_organization_id: organizationId,
          p_batch_type: batchType,
          p_jobs: jobs,
        });
        
        if (batchError) throw batchError;
        
        // Estimate completion time (rough: 100 jobs/minute)
        const estimatedMinutes = Math.ceil(jobs.length / 100);
        const estimatedCompletion = new Date(Date.now() + estimatedMinutes * 60 * 1000);
        
        // Update batch with estimate
        await supabase
          .from("job_batches")
          .update({ estimated_completion: estimatedCompletion.toISOString() })
          .eq("id", batchId);
        
        return new Response(
          JSON.stringify({
            batchId,
            totalJobs: jobs.length,
            estimatedCost,
            estimatedCompletion: estimatedCompletion.toISOString(),
            estimatedMinutes,
            message: `Batch submitted successfully. ${jobs.length} jobs queued.`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // GET BATCH STATUS: Check progress of a batch
      // ========================================================================
      case "getBatchStatus": {
        const { batchId } = params;
        
        const { data: batch, error } = await supabase
          .from("job_batches")
          .select("*")
          .eq("id", batchId)
          .eq("user_id", user.id)
          .single();
        
        if (error || !batch) {
          return new Response(
            JSON.stringify({ error: "Batch not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const status: BatchStatus = {
          id: batch.id,
          status: batch.status,
          totalJobs: batch.total_jobs,
          completedJobs: batch.completed_jobs,
          failedJobs: batch.failed_jobs,
          progressPercentage: batch.progress_percentage,
          estimatedCost: batch.estimated_cost,
          actualCost: batch.actual_cost || 0,
          estimatedCompletion: batch.estimated_completion,
        };
        
        return new Response(
          JSON.stringify({ batch: status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // LIST BATCHES: Get all batches for user
      // ========================================================================
      case "listBatches": {
        const { status: filterStatus, limit = 20 } = params;
        
        let query = supabase
          .from("job_batches")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(limit);
        
        if (filterStatus) {
          query = query.eq("status", filterStatus);
        }
        
        const { data: batches, error } = await query;
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ batches }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // CANCEL BATCH: Cancel pending jobs in a batch
      // ========================================================================
      case "cancelBatch": {
        const { batchId } = params;
        
        // Update batch status
        const { error: batchError } = await supabase
          .from("job_batches")
          .update({ status: "cancelled" })
          .eq("id", batchId)
          .eq("user_id", user.id)
          .in("status", ["pending", "processing"]);
        
        if (batchError) throw batchError;
        
        // Cancel pending jobs
        const { data: cancelled } = await supabase
          .from("job_queue_partitioned")
          .update({ status: "cancelled" })
          .eq("batch_id", batchId)
          .eq("status", "pending")
          .select("id");
        
        return new Response(
          JSON.stringify({
            success: true,
            cancelledJobs: cancelled?.length || 0,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // GET THROUGHPUT: Current system throughput metrics
      // ========================================================================
      case "getThroughput": {
        const { hours = 24 } = params;
        
        const { data: metrics, error } = await supabase.rpc("get_throughput_metrics", {
          p_organization_id: organizationId,
          p_hours: hours,
        });
        
        if (error) throw error;
        
        // Calculate summary
        const totalJobs = metrics?.reduce((sum: number, m: any) => sum + m.jobs_submitted, 0) || 0;
        const completedJobs = metrics?.reduce((sum: number, m: any) => sum + m.jobs_completed, 0) || 0;
        const failedJobs = metrics?.reduce((sum: number, m: any) => sum + m.jobs_failed, 0) || 0;
        const avgThroughput = metrics?.length > 0
          ? metrics.reduce((sum: number, m: any) => sum + m.throughput_per_minute, 0) / metrics.length
          : 0;
        
        return new Response(
          JSON.stringify({
            summary: {
              totalJobs,
              completedJobs,
              failedJobs,
              successRate: totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(2) : 0,
              avgThroughputPerMinute: avgThroughput.toFixed(2),
              periodHours: hours,
            },
            hourlyMetrics: metrics,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ========================================================================
      // ESTIMATE COST: Get cost estimate for a batch before submitting
      // ========================================================================
      case "estimateCost": {
        const { batchType, jobCount } = params;
        
        const costPerJob = COST_PER_OPERATION[batchType] || 0.003;
        const baseCost = jobCount * costPerJob;
        
        // Check for volume discount
        let volumeDiscount = 0;
        if (organizationId) {
          const { data: billing } = await supabase
            .from("organization_billing")
            .select("current_month_prompts")
            .eq("organization_id", organizationId)
            .single();
          
          if (billing && billing.current_month_prompts > 100000) {
            volumeDiscount = baseCost * 0.10; // 10% discount
          }
        }
        
        const finalCost = baseCost - volumeDiscount;
        
        // Estimate time
        const estimatedMinutes = Math.ceil(jobCount / 100);
        
        return new Response(
          JSON.stringify({
            jobCount,
            batchType,
            costPerJob,
            baseCost,
            volumeDiscount,
            finalCost,
            estimatedMinutes,
            estimatedCompletion: new Date(Date.now() + estimatedMinutes * 60 * 1000).toISOString(),
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
    console.error("Batch processor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
