import { useState, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, LogOut, Check, Trash2, TrendingUp, TrendingDown, AlertTriangle, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAlerts } from "@/hooks/useAlerts";
import { formatDistanceToNow } from "date-fns";
import { SidebarToggle } from "./Sidebar";

interface HeaderProps {
  title: string;
  breadcrumb?: string[];
  actions?: React.ReactNode;
}

const alertIcons: Record<string, React.ElementType> = {
  visibility_change: TrendingUp,
  competitor_overtake: TrendingDown,
  new_citation: Link2,
  sentiment_shift: AlertTriangle,
};

const severityColors: Record<string, string> = {
  info: "border-l-fz-blue",
  warning: "border-l-fz-amber",
  critical: "border-l-fz-red",
};

export const Header = forwardRef<HTMLElement, HeaderProps>(function Header({ title, breadcrumb, actions }, ref) {
  const [showAlerts, setShowAlerts] = useState(false);
  const { signOut, user } = useAuth();
  const { alerts, unreadCount, markAsRead, markAllAsRead, deleteAlert } = useAlerts();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header
      ref={ref}
      className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-6 h-16">
        {/* Left side - Toggle + Title */}
        <div className="flex items-center gap-4">
          <SidebarToggle />
          
          <div>
            {breadcrumb && breadcrumb.length > 0 && (
              <div className="flex items-center gap-1.5 text-meta text-muted-foreground mb-0.5">
                {breadcrumb.map((item, index) => (
                  <span key={index} className="flex items-center gap-1.5">
                    {index > 0 && <span className="text-border">›</span>}
                    <span className={cn(
                      index === breadcrumb.length - 1 && "text-foreground"
                    )}>
                      {item}
                    </span>
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-page-title text-foreground">{title}</h1>
          </div>
        </div>

        {/* Right side - Actions + Notifications + User */}
        <div className="flex items-center gap-3">
          {/* Custom actions slot */}
          {actions}

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className={cn(
                "relative p-2 rounded-lg transition-colors duration-fz",
                showAlerts 
                  ? "bg-secondary text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fz-red text-[10px] font-medium text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Alerts Dropdown */}
            <AnimatePresence>
              {showAlerts && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowAlerts(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 z-50 w-80"
                  >
                    <div className="fz-card overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span className="text-body-sm font-medium text-foreground">Notifications</span>
                          {unreadCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-fz-blue/10 text-fz-blue text-[10px] font-medium">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-meta text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-80 overflow-y-auto">
                        {alerts.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Bell className="h-8 w-8 opacity-30 mb-2" />
                            <p className="text-body-sm">No notifications</p>
                          </div>
                        ) : (
                          <div className="p-2 space-y-1">
                            {alerts.slice(0, 5).map((alert) => {
                              const Icon = alertIcons[alert.type] || Bell;
                              return (
                                <div
                                  key={alert.id}
                                  className={cn(
                                    "group relative rounded-lg border-l-2 p-3 transition-colors duration-fz",
                                    severityColors[alert.severity || "info"],
                                    !alert.read 
                                      ? "bg-secondary/50" 
                                      : "bg-transparent hover:bg-secondary/30"
                                  )}
                                >
                                  <div className="flex gap-3">
                                    <Icon
                                      className={cn(
                                        "h-4 w-4 flex-shrink-0 mt-0.5",
                                        alert.severity === "critical"
                                          ? "text-fz-red"
                                          : alert.severity === "warning"
                                          ? "text-fz-amber"
                                          : "text-fz-blue"
                                      )}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className={cn(
                                        "text-body-sm",
                                        !alert.read ? "text-foreground font-medium" : "text-muted-foreground"
                                      )}>
                                        {alert.title}
                                      </p>
                                      <p className="text-meta text-muted-foreground line-clamp-2 mt-0.5">
                                        {alert.message}
                                      </p>
                                      <span className="text-meta text-muted-foreground/60 mt-1 block">
                                        {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!alert.read && (
                                      <button
                                        onClick={() => markAsRead(alert.id)}
                                        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary"
                                      >
                                        <Check className="h-3 w-3" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteAlert(alert.id)}
                                      className="p-1 rounded text-muted-foreground hover:text-fz-red hover:bg-fz-red/10"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
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
          </div>

          {/* User & Logout */}
          <div className="flex items-center gap-3 pl-3 border-l border-border">
            {user && (
              <span className="text-body-sm text-muted-foreground">
                {user.email?.split("@")[0]}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-body-sm text-muted-foreground hover:text-fz-red hover:bg-fz-red/5 transition-colors duration-fz"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
});
