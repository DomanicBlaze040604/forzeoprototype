import { motion, AnimatePresence } from "framer-motion";
import { useAlerts } from "@/hooks/useAlerts";
import { Button } from "@/components/ui/button";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Link2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface AlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const alertIcons: Record<string, React.ElementType> = {
  visibility_change: TrendingUp,
  competitor_overtake: TrendingDown,
  new_citation: Link2,
  sentiment_shift: AlertTriangle,
};

const severityColors: Record<string, string> = {
  info: "border-l-primary",
  warning: "border-l-warning",
  critical: "border-l-destructive",
};

export function AlertsPanel({ isOpen, onClose }: AlertsPanelProps) {
  const { alerts, unreadCount, markAsRead, markAllAsRead, deleteAlert } = useAlerts();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed right-0 top-0 z-50 h-screen w-full max-w-md border-l border-border bg-card shadow-2xl"
          >
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border p-4">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Alerts</h2>
                  {unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                      <CheckCheck className="mr-1 h-4 w-4" />
                      Mark all read
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Alerts List */}
              <div className="flex-1 overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Bell className="mx-auto mb-2 h-10 w-10 opacity-50" />
                      <p>No alerts yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {alerts.map((alert, index) => {
                      const Icon = alertIcons[alert.type] || Bell;
                      return (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={cn(
                            "group relative rounded-lg border-l-4 bg-secondary/30 p-4 transition-all hover:bg-secondary/50",
                            severityColors[alert.severity],
                            !alert.read && "bg-secondary/50"
                          )}
                        >
                          <div className="flex gap-3">
                            <div className="flex-shrink-0">
                              <Icon
                                className={cn(
                                  "h-5 w-5",
                                  alert.severity === "critical"
                                    ? "text-destructive"
                                    : alert.severity === "warning"
                                    ? "text-warning"
                                    : "text-primary"
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3
                                  className={cn(
                                    "text-sm font-medium",
                                    !alert.read ? "text-foreground" : "text-muted-foreground"
                                  )}
                                >
                                  {alert.title}
                                </h3>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDistanceToNow(new Date(alert.created_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                                {alert.message}
                              </p>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            {!alert.read && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => markAsRead(alert.id)}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => deleteAlert(alert.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
