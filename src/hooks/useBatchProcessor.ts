import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BatchSubmission {
  batchType: "prompt_analysis" | "score_recalc" | "citation_verify" | "authority_update";
  jobs: Array<Record<string, any>>;
  priority?: number;
}

export interface BatchStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  progressPercentage: number;
  estimatedCost: number;
  actualCost: number;
  estimatedCompletion?: string;
}

export interface ThroughputMetrics {
  summary: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    successRate: string;
    avgThroughputPerMinute: string;
    periodHours: number;
  };
  hourlyMetrics: Array<{
    hour_bucket: string;
    jobs_submitted: number;
    jobs_completed: number;
    jobs_failed: number;
    avg_duration_ms: number;
    throughput_per_minute: number;
    estimated_cost: number;
  }>;
}

export interface CostEstimate {
  jobCount: number;
  batchType: string;
  costPerJob: number;
  baseCost: number;
  volumeDiscount: number;
  finalCost: number;
  estimatedMinutes: number;
  estimatedCompletion: string;
}

export function useBatchProcessor() {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<BatchStatus[]>([]);
  const { toast } = useToast();

  const submitBatch = useCallback(async (
    submission: BatchSubmission
  ): Promise<{ batchId: string; estimatedCost: number } | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("batch-processor", {
        body: {
          action: "submitBatch",
          ...submission,
        },
      });
      
      if (error) throw error;
      
      if (data.error) {
        // Budget exceeded
        toast({
          title: "Budget Limit",
          description: data.reason || data.error,
          variant: "destructive",
        });
        return null;
      }
      
      toast({
        title: "Batch Submitted",
        description: `${data.totalJobs} jobs queued. Estimated completion: ${new Date(data.estimatedCompletion).toLocaleTimeString()}`,
      });
      
      return {
        batchId: data.batchId,
        estimatedCost: data.estimatedCost,
      };
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to submit batch",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getBatchStatus = useCallback(async (batchId: string): Promise<BatchStatus | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("batch-processor", {
        body: { action: "getBatchStatus", batchId },
      });
      
      if (error) throw error;
      return data.batch;
    } catch (err) {
      console.error("Failed to get batch status:", err);
      return null;
    }
  }, []);

  const listBatches = useCallback(async (
    status?: string,
    limit: number = 20
  ): Promise<void> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("batch-processor", {
        body: { action: "listBatches", status, limit },
      });
      
      if (error) throw error;
      setBatches(data.batches || []);
    } catch (err) {
      console.error("Failed to list batches:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelBatch = useCallback(async (batchId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("batch-processor", {
        body: { action: "cancelBatch", batchId },
      });
      
      if (error) throw error;
      
      toast({
        title: "Batch Cancelled",
        description: `${data.cancelledJobs} pending jobs cancelled`,
      });
      
      return true;
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to cancel batch",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const getThroughput = useCallback(async (hours: number = 24): Promise<ThroughputMetrics | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("batch-processor", {
        body: { action: "getThroughput", hours },
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Failed to get throughput:", err);
      return null;
    }
  }, []);

  const estimateCost = useCallback(async (
    batchType: string,
    jobCount: number
  ): Promise<CostEstimate | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("batch-processor", {
        body: { action: "estimateCost", batchType, jobCount },
      });
      
      if (error) throw error;
      return data;
    } catch (err) {
      console.error("Failed to estimate cost:", err);
      return null;
    }
  }, []);

  return {
    loading,
    batches,
    submitBatch,
    getBatchStatus,
    listBatches,
    cancelBatch,
    getThroughput,
    estimateCost,
  };
}
