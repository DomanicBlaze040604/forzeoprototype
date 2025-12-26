import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface ScheduledReport {
  id: string;
  user_id: string;
  brand_id: string | null;
  schedule_type: string;
  last_run_at: string | null;
  next_run_at: string | null;
  personas: string[];
  is_active: boolean;
  created_at: string;
}

interface UseScheduledAnalysisReturn {
  schedules: ScheduledReport[];
  loading: boolean;
  createSchedule: (
    brandId: string,
    scheduleType: string,
    personas: string[]
  ) => Promise<void>;
  updateSchedule: (id: string, updates: Partial<ScheduledReport>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  runNow: (scheduleId: string) => Promise<void>;
  running: boolean;
}

const PERSONAS = [
  "General User",
  "CTO",
  "Developer",
  "Student",
  "Investor",
  "Manager",
];

export function useScheduledAnalysis(): UseScheduledAnalysisReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchSchedules = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("scheduled_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSchedules(data as ScheduledReport[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const createSchedule = useCallback(
    async (brandId: string, scheduleType: string, personas: string[]) => {
      if (!user) return;

      const nextRun = new Date();
      if (scheduleType === "daily") {
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(9, 0, 0, 0);
      } else if (scheduleType === "weekly") {
        nextRun.setDate(nextRun.getDate() + 7);
        nextRun.setHours(9, 0, 0, 0);
      }

      const { data, error } = await supabase
        .from("scheduled_reports")
        .insert({
          user_id: user.id,
          brand_id: brandId,
          schedule_type: scheduleType,
          personas: personas.length > 0 ? personas : PERSONAS,
          next_run_at: nextRun.toISOString(),
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create schedule",
          variant: "destructive",
        });
      } else {
        setSchedules((prev) => [data as ScheduledReport, ...prev]);
        toast({
          title: "Schedule Created",
          description: `Analysis will run ${scheduleType}`,
        });
      }
    },
    [user, toast]
  );

  const updateSchedule = useCallback(
    async (id: string, updates: Partial<ScheduledReport>) => {
      const { error } = await supabase
        .from("scheduled_reports")
        .update(updates)
        .eq("id", id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update schedule",
          variant: "destructive",
        });
      } else {
        setSchedules((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
        );
        toast({
          title: "Updated",
          description: "Schedule updated successfully",
        });
      }
    },
    [toast]
  );

  const deleteSchedule = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("scheduled_reports")
        .delete()
        .eq("id", id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to delete schedule",
          variant: "destructive",
        });
      } else {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
        toast({
          title: "Deleted",
          description: "Schedule removed",
        });
      }
    },
    [toast]
  );

  const runNow = useCallback(
    async (scheduleId: string) => {
      if (!user) return;

      setRunning(true);
      toast({
        title: "Analysis Started",
        description: "Running analysis across all personas. You'll receive an email when complete.",
      });

      try {
        // Get the schedule details
        const schedule = schedules.find(s => s.id === scheduleId);
        if (!schedule) throw new Error("Schedule not found");

        // Get user's primary brand
        const { data: brand } = await supabase
          .from("brands")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_primary", true)
          .maybeSingle();

        if (!brand) {
          toast({
            title: "Error",
            description: "No primary brand found. Please set a primary brand first.",
            variant: "destructive",
          });
          setRunning(false);
          return;
        }

        // Get user's prompts
        const { data: prompts } = await supabase
          .from("prompts")
          .select("id")
          .eq("user_id", user.id)
          .limit(10);

        if (!prompts || prompts.length === 0) {
          toast({
            title: "Error",
            description: "No prompts found. Add some prompts to analyze.",
            variant: "destructive",
          });
          setRunning(false);
          return;
        }

        // Call batch-analysis function
        const { data, error } = await supabase.functions.invoke("batch-analysis", {
          body: {
            userId: user.id,
            promptIds: prompts.map(p => p.id),
            personas: schedule.personas || PERSONAS,
            brandName: brand.name,
            scheduleId,
            sendEmail: true,
          },
        });

        if (error) throw error;

        toast({
          title: "Analysis Complete",
          description: `${data.wins}/${data.totalJobs} brand mentions. Check War Room for details.`,
        });

        await fetchSchedules();
      } catch (error) {
        console.error("Analysis failed:", error);
        toast({
          title: "Error",
          description: "Analysis failed. Check logs for details.",
          variant: "destructive",
        });
      } finally {
        setRunning(false);
      }
    },
    [user, toast, fetchSchedules, schedules]
  );

  return {
    schedules,
    loading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    runNow,
    running,
  };
}
