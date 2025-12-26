import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, X, ChevronDown, ChevronUp } from "lucide-react";
import { useEngineAuthority } from "@/hooks/useEngineAuthority";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface SystemNotification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  related_engine?: string;
  is_active: boolean;
  created_at: string;
}

export function SystemStatusBanner() {
  const { outages, hasActiveOutages, degradedEngines, overallHealth } =
    useEngineAuthority();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("system_notifications")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);

      setNotifications((data as SystemNotification[]) || []);
    };

    fetchNotifications();

    const channel = supabase
      .channel("system_notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_notifications" },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dismissNotification = async (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));

    await supabase
      .from("system_notifications")
      .update({ dismissed_at: new Date().toISOString(), is_active: false })
      .eq("id", id);
  };

  const activeNotifications = notifications.filter((n) => !dismissed.has(n.id));
  const hasIssues =
    hasActiveOutages ||
    degradedEngines.length > 0 ||
    activeNotifications.length > 0;

  // Show healthy status bar when everything is fine
  if (!hasIssues && overallHealth >= 90) {
    return (
      <div className="px-6 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-2 text-body-sm">
          <div className="h-2 w-2 rounded-full bg-fz-green" />
          <span className="text-muted-foreground">All engines operational</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground tabular-nums">
            {overallHealth}% system health
          </span>
        </div>
      </div>
    );
  }

  const isWarning = degradedEngines.length > 0 && !hasActiveOutages;
  const isCritical = hasActiveOutages;

  return (
    <div
      className={cn(
        "px-6 py-3 border-b",
        isCritical
          ? "bg-fz-red/5 border-fz-red/20"
          : isWarning
          ? "bg-fz-amber/5 border-fz-amber/20"
          : "bg-fz-blue/5 border-fz-blue/20"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertCircle
            className={cn(
              "h-4 w-4 mt-0.5 flex-shrink-0",
              isCritical
                ? "text-fz-red"
                : isWarning
                ? "text-fz-amber"
                : "text-fz-blue"
            )}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-body-sm font-medium text-foreground">
                {hasActiveOutages
                  ? "Engine Outage Detected"
                  : degradedEngines.length > 0
                  ? "Degraded Performance"
                  : "System Notice"}
              </span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium",
                  isCritical
                    ? "bg-fz-red/10 text-fz-red"
                    : isWarning
                    ? "bg-fz-amber/10 text-fz-amber"
                    : "bg-fz-blue/10 text-fz-blue"
                )}
              >
                {overallHealth}% health
              </span>
            </div>

            <p className="text-body-sm text-muted-foreground mt-1">
              {hasActiveOutages ? (
                <>
                  {outages.length} engine{outages.length > 1 ? "s" : ""}{" "}
                  unavailable. Scores use last known good data.
                </>
              ) : degradedEngines.length > 0 ? (
                <>
                  {degradedEngines.length} engine
                  {degradedEngines.length > 1 ? "s" : ""} experiencing issues.
                  Scores may have reduced confidence.
                </>
              ) : (
                "System notifications may affect your data."
              )}
            </p>

            {/* Affected engines */}
            {(hasActiveOutages || degradedEngines.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {outages.map((outage) => (
                  <span
                    key={outage.id}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-fz-red/10 text-fz-red border border-fz-red/20"
                  >
                    {outage.display_name} · Down{" "}
                    {formatDistanceToNow(new Date(outage.started_at))}
                  </span>
                ))}
                {degradedEngines.map((engine) => (
                  <span
                    key={engine.engine}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-fz-amber/10 text-fz-amber border border-fz-amber/20"
                  >
                    {engine.display_name} · Degraded
                  </span>
                ))}
              </div>
            )}

            {/* Expandable notifications */}
            {activeNotifications.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-meta text-muted-foreground hover:text-foreground transition-colors duration-fz"
                >
                  {expanded ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {activeNotifications.length} notification
                  {activeNotifications.length > 1 ? "s" : ""}
                </button>

                {expanded && (
                  <div className="mt-2 space-y-2">
                    {activeNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-2 p-2 rounded-lg text-body-sm",
                          notification.severity === "critical"
                            ? "bg-fz-red/5"
                            : notification.severity === "warning"
                            ? "bg-fz-amber/5"
                            : "bg-fz-blue/5"
                        )}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {notification.title}
                          </p>
                          <p className="text-meta text-muted-foreground mt-0.5">
                            {notification.message}
                          </p>
                        </div>
                        <button
                          onClick={() => dismissNotification(notification.id)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-fz"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
