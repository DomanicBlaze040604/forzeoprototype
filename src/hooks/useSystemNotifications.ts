import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SystemNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  related_engine?: string;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

export function useSystemNotifications() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch user-specific and broadcast notifications
      const { data, error } = await supabase
        .from("system_notifications")
        .select("*")
        .eq("is_active", true)
        .or(`user_id.eq.${user?.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      setNotifications((data as SystemNotification[]) || []);
    } catch (err) {
      console.error("Failed to fetch system notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const dismissNotification = useCallback(async (id: string) => {
    try {
      await supabase
        .from("system_notifications")
        .update({ 
          is_active: false, 
          dismissed_at: new Date().toISOString() 
        })
        .eq("id", id);
      
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error("Failed to dismiss notification:", err);
    }
  }, []);

  const dismissAll = useCallback(async () => {
    try {
      const ids = notifications.map(n => n.id);
      await supabase
        .from("system_notifications")
        .update({ 
          is_active: false, 
          dismissed_at: new Date().toISOString() 
        })
        .in("id", ids);
      
      setNotifications([]);
    } catch (err) {
      console.error("Failed to dismiss all notifications:", err);
    }
  }, [notifications]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }

    // Subscribe to new notifications
    const channel = supabase
      .channel("system_notifications_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_notifications" },
        (payload) => {
          const newNotification = payload.new as SystemNotification;
          // Only add if it's for this user or a broadcast
          if (!newNotification.user_id || newNotification.user_id === user?.id) {
            setNotifications(prev => [newNotification, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  // Computed values
  const criticalCount = notifications.filter(n => n.severity === "critical").length;
  const warningCount = notifications.filter(n => n.severity === "warning").length;
  const hasUrgent = criticalCount > 0;

  return {
    notifications,
    loading,
    criticalCount,
    warningCount,
    hasUrgent,
    fetchNotifications,
    dismissNotification,
    dismissAll,
  };
}
