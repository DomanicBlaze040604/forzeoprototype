import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

interface NotificationSettings {
  id: string;
  user_id: string;
  visibility_threshold: number;
  email_enabled: boolean;
  visibility_drop_alert: boolean;
  competitor_overtake_alert: boolean;
  daily_summary_enabled: boolean;
  weekly_report_enabled: boolean;
}

const defaultSettings: Omit<NotificationSettings, "id" | "user_id"> = {
  visibility_threshold: 70,
  email_enabled: true,
  visibility_drop_alert: true,
  competitor_overtake_alert: true,
  daily_summary_enabled: false,
  weekly_report_enabled: true,
};

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }

    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching notification settings:", error);
    } else if (data) {
      setSettings(data);
    } else {
      // Create default settings if none exist
      const { data: newSettings, error: createError } = await supabase
        .from("notification_settings")
        .insert({ user_id: user.id, ...defaultSettings })
        .select()
        .single();

      if (!createError && newSettings) {
        setSettings(newSettings);
      }
    }
    setLoading(false);
  };

  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!user || !settings) return false;

    setSaving(true);

    const { error } = await supabase
      .from("notification_settings")
      .update(updates)
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Error saving settings",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    setSettings({ ...settings, ...updates });
    toast({
      title: "Settings saved",
      description: "Your notification preferences have been updated",
    });

    return true;
  };

  return {
    settings,
    loading,
    saving,
    updateSettings,
    refetch: fetchSettings,
  };
}
