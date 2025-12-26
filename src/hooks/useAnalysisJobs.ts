import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type JobPhase = "pending" | "scraping" | "thinking" | "judging" | "complete" | "failed";

export interface AnalysisJob {
  id: string;
  user_id: string;
  prompt_id: string | null;
  prompt_text: string;
  model: string;
  persona: string;
  phase: JobPhase;
  brand_mentioned: boolean | null;
  sentiment: string | null;
  accuracy: number | null;
  reasoning: string | null;
  created_at: string;
  completed_at: string | null;
}

interface UseAnalysisJobsReturn {
  jobs: AnalysisJob[];
  stats: {
    total: number;
    wins: number;
    losses: number;
    inProgress: number;
  };
  clearJobs: () => void;
  loading: boolean;
}

export function useAnalysisJobs(): UseAnalysisJobsReturn {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial jobs
  useEffect(() => {
    if (!user) return;

    async function fetchJobs() {
      setLoading(true);
      const { data, error } = await supabase
        .from("analysis_jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setJobs(data as AnalysisJob[]);
      }
      setLoading(false);
    }

    fetchJobs();
  }, [user]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("analysis-jobs-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "analysis_jobs",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("New analysis job:", payload.new);
          setJobs((prev) => [payload.new as AnalysisJob, ...prev].slice(0, 50));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "analysis_jobs",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Updated analysis job:", payload.new);
          setJobs((prev) =>
            prev.map((job) =>
              job.id === (payload.new as AnalysisJob).id
                ? (payload.new as AnalysisJob)
                : job
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const clearJobs = useCallback(async () => {
    if (!user) return;

    await supabase.from("analysis_jobs").delete().eq("user_id", user.id);
    setJobs([]);
  }, [user]);

  // Calculate stats
  const stats = {
    total: jobs.length,
    wins: jobs.filter((j) => j.phase === "complete" && j.brand_mentioned).length,
    losses: jobs.filter((j) => j.phase === "complete" && !j.brand_mentioned).length,
    inProgress: jobs.filter(
      (j) => j.phase !== "complete" && j.phase !== "failed"
    ).length,
  };

  return {
    jobs,
    stats,
    clearJobs,
    loading,
  };
}
