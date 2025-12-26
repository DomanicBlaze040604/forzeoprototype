import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface Job {
  id: string;
  user_id: string;
  job_type: string;
  status: "pending" | "processing" | "completed" | "failed" | "dead_letter";
  payload: Record<string, any>;
  result?: Record<string, any>;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  priority: number;
  scheduled_for: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface CreateJobParams {
  job_type: string;
  payload: Record<string, any>;
  priority?: number;
  scheduled_for?: Date;
  max_retries?: number;
}

export function useJobQueue() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchJobs = useCallback(async (status?: string) => {
    if (!user) return;
    setLoading(true);
    
    try {
      let query = supabase
        .from("job_queue")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (status) {
        query = query.eq("status", status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setJobs((data as Job[]) || []);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createJob = useCallback(async (params: CreateJobParams): Promise<Job | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from("job_queue")
        .insert({
          user_id: user.id,
          job_type: params.job_type,
          payload: params.payload,
          priority: params.priority || 0,
          scheduled_for: params.scheduled_for?.toISOString() || new Date().toISOString(),
          max_retries: params.max_retries || 3,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast({
        title: "Job Created",
        description: `${params.job_type} job queued successfully`,
      });
      
      return data as Job;
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      });
      return null;
    }
  }, [user, toast]);

  const createBulkJobs = useCallback(async (jobsToCreate: CreateJobParams[]): Promise<Job[]> => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from("job_queue")
        .insert(
          jobsToCreate.map(params => ({
            user_id: user.id,
            job_type: params.job_type,
            payload: params.payload,
            priority: params.priority || 0,
            scheduled_for: params.scheduled_for?.toISOString() || new Date().toISOString(),
            max_retries: params.max_retries || 3,
          }))
        )
        .select();
      
      if (error) throw error;
      
      toast({
        title: "Jobs Created",
        description: `${jobsToCreate.length} jobs queued successfully`,
      });
      
      return (data as Job[]) || [];
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to create jobs",
        variant: "destructive",
      });
      return [];
    }
  }, [user, toast]);

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("job_queue")
        .update({ status: "failed", error_message: "Cancelled by user" })
        .eq("id", jobId)
        .eq("status", "pending");
      
      if (error) throw error;
      
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: "failed" as const, error_message: "Cancelled by user" } : j
      ));
      
      toast({
        title: "Job Cancelled",
        description: "The job has been cancelled",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to cancel job",
        variant: "destructive",
      });
    }
  }, [toast]);

  const retryJob = useCallback(async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("job_queue")
        .update({ 
          status: "pending", 
          error_message: null,
          retry_count: 0,
          scheduled_for: new Date().toISOString(),
        })
        .eq("id", jobId);
      
      if (error) throw error;
      
      setJobs(prev => prev.map(j => 
        j.id === jobId ? { ...j, status: "pending" as const, error_message: undefined } : j
      ));
      
      toast({
        title: "Job Retried",
        description: "The job has been requeued",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to retry job",
        variant: "destructive",
      });
    }
  }, [toast]);

  const getJobStats = useCallback(() => {
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === "pending").length,
      processing: jobs.filter(j => j.status === "processing").length,
      completed: jobs.filter(j => j.status === "completed").length,
      failed: jobs.filter(j => j.status === "failed").length,
      deadLetter: jobs.filter(j => j.status === "dead_letter").length,
    };
  }, [jobs]);

  // Subscribe to job updates
  useEffect(() => {
    if (!user) return;
    
    const channel = supabase
      .channel("job_queue_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_queue",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setJobs(prev => [payload.new as Job, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setJobs(prev => prev.map(j => 
              j.id === payload.new.id ? payload.new as Job : j
            ));
          } else if (payload.eventType === "DELETE") {
            setJobs(prev => prev.filter(j => j.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    jobs,
    loading,
    fetchJobs,
    createJob,
    createBulkJobs,
    cancelJob,
    retryJob,
    getJobStats,
  };
}

// Hook for orchestrating large-scale prompt analysis
export function usePromptOrchestrator() {
  const { createBulkJobs } = useJobQueue();
  const { toast } = useToast();

  const orchestrateAnalysis = useCallback(async (
    prompts: Array<{ id: string; text: string }>,
    options: {
      engines?: string[];
      personas?: string[];
      batchSize?: number;
      priority?: number;
    } = {}
  ) => {
    const {
      engines = ["chatgpt", "gemini", "perplexity", "google_ai_mode"],
      personas = ["general"],
      batchSize = 10,
      priority = 0,
    } = options;

    const jobs: Array<{
      job_type: string;
      payload: Record<string, any>;
      priority: number;
    }> = [];

    // Create jobs for each prompt/engine/persona combination
    for (const prompt of prompts) {
      for (const engine of engines) {
        for (const persona of personas) {
          jobs.push({
            job_type: "analyze_prompt",
            payload: {
              prompt_id: prompt.id,
              prompt_text: prompt.text,
              engine,
              persona,
            },
            priority,
          });
        }
      }
    }

    // Split into batches
    const batches: typeof jobs[] = [];
    for (let i = 0; i < jobs.length; i += batchSize) {
      batches.push(jobs.slice(i, i + batchSize));
    }

    toast({
      title: "Orchestrating Analysis",
      description: `Creating ${jobs.length} jobs in ${batches.length} batches...`,
    });

    let createdCount = 0;
    for (const batch of batches) {
      const created = await createBulkJobs(batch);
      createdCount += created.length;
    }

    toast({
      title: "Analysis Queued",
      description: `${createdCount} analysis jobs created successfully`,
    });

    return createdCount;
  }, [createBulkJobs, toast]);

  return { orchestrateAnalysis };
}
