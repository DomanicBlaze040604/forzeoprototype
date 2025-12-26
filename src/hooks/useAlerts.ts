import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  read: boolean;
  data: any;
  created_at: string;
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setAlerts([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Fetch initial alerts
    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching alerts:", error);
      } else {
        setAlerts(data || []);
        setUnreadCount(data?.filter((a) => !a.read).length || 0);
      }
      setLoading(false);
    };

    fetchAlerts();

    // Subscribe to realtime alerts
    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alerts",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newAlert = payload.new as Alert;
          setAlerts((prev) => [newAlert, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show toast for new alerts
          toast({
            title: newAlert.title,
            description: newAlert.message,
            variant: newAlert.severity === "critical" ? "destructive" : "default",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const markAsRead = async (alertId: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ read: true })
      .eq("id", alertId);

    if (!error) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, read: true } : a))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from("alerts")
      .update({ read: true })
      .eq("read", false);

    if (!error) {
      setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
      setUnreadCount(0);
    }
  };

  const deleteAlert = async (alertId: string) => {
    const alert = alerts.find((a) => a.id === alertId);
    const { error } = await supabase.from("alerts").delete().eq("id", alertId);

    if (!error) {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      if (alert && !alert.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  return {
    alerts,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteAlert,
  };
}
