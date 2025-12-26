import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

interface UsageSummary {
  daily: { cost: number; calls: number; byApi: Record<string, number> };
  monthly: { cost: number; calls: number; byApi: Record<string, number> };
  limits: { daily: number; monthly: number; alertThreshold: number };
  alerts: {
    dailyWarning: boolean;
    monthlyWarning: boolean;
    dailyExceeded: boolean;
    monthlyExceeded: boolean;
  };
}

interface CostLimits {
  dailyLimit: number;
  monthlyLimit: number;
  alertThreshold: number;
  emailOnThreshold: boolean;
}

export function useCostTracking() {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSummary = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("cost-tracker", {
        body: { action: "summary" },
      });
      
      if (error) throw error;
      setSummary(data);
      
      // Show warning if approaching limits
      if (data.alerts.dailyWarning && !data.alerts.dailyExceeded) {
        toast({
          title: "Daily Cost Warning",
          description: `You've used ${Math.round((data.daily.cost / data.limits.daily) * 100)}% of your daily limit`,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to fetch cost summary:", err);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const setLimits = useCallback(async (limits: CostLimits) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.functions.invoke("cost-tracker", {
        body: { action: "setLimits", ...limits },
      });
      
      if (error) throw error;
      
      toast({
        title: "Limits Updated",
        description: "Your cost limits have been updated",
      });
      
      await fetchSummary();
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update limits",
        variant: "destructive",
      });
    }
  }, [user, toast, fetchSummary]);

  const checkLimits = useCallback((): { allowed: boolean; reason?: string } => {
    if (!summary) return { allowed: true };
    
    if (summary.alerts.dailyExceeded) {
      return { allowed: false, reason: "Daily cost limit exceeded" };
    }
    if (summary.alerts.monthlyExceeded) {
      return { allowed: false, reason: "Monthly cost limit exceeded" };
    }
    
    return { allowed: true };
  }, [summary]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    fetchSummary,
    setLimits,
    checkLimits,
  };
}
