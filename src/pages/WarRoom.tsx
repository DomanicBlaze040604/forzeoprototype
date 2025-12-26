import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Activity, 
  Radio, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Bot, 
  Search,
  Brain,
  Scale,
  Pause,
  Play,
  RefreshCw,
  Users,
  Wifi,
  WifiOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrands } from "@/hooks/useBrands";
import { useAnalysisJobs, type JobPhase, type AnalysisJob } from "@/hooks/useAnalysisJobs";

const PERSONAS = ["CTO", "Developer", "Student", "Investor", "Manager"];

const phaseIcons: Record<JobPhase, React.ElementType> = {
  pending: Search,
  scraping: Search,
  thinking: Brain,
  judging: Scale,
  complete: CheckCircle2,
  failed: XCircle,
};

const phaseLabels: Record<JobPhase, string> = {
  pending: "Pending",
  scraping: "Scraping",
  thinking: "Thinking",
  judging: "Judging",
  complete: "Complete",
  failed: "Failed",
};

export default function WarRoom() {
  const { activeBrand } = useBrands();
  const { jobs, stats, clearJobs, loading } = useAnalysisJobs();
  const { isOpen } = useSidebar();
  const [isConnected, setIsConnected] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  // Filter jobs based on pause state
  const displayedJobs = isPaused ? jobs : jobs;

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar />
      
      <main className={cn(
        "transition-all duration-200 ease-in-out",
        isOpen ? "pl-56" : "pl-0"
      )}>
        <Header title="War Room" breadcrumb={[activeBrand?.name || "FORZEO", "Live Operations"]} />
        
        <div className="p-6">
          {/* Status Bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-success" />
                ) : (
                  <WifiOff className="h-4 w-4 text-destructive" />
                )}
                <Radio className={cn(
                  "h-4 w-4",
                  isPaused ? "text-muted-foreground" : "text-success animate-pulse"
                )} />
                <span className="text-sm font-medium">
                  {isPaused ? "Paused" : "Live Feed"}
                </span>
                <Badge variant="outline" className="text-xs">
                  Real-time WebSocket
                </Badge>
              </div>
              
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                {stats.wins} Wins
              </Badge>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                {stats.losses} Losses
              </Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                {stats.inProgress} In Progress
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
                className="gap-2"
              >
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {isPaused ? "Resume" : "Pause"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearJobs}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Clear
              </Button>
            </div>
          </motion.div>

          {/* Agent Matrix */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Active Personas</h3>
            </div>
            <div className="flex items-center gap-3">
              {PERSONAS.map((persona) => {
                const activeCount = jobs.filter(
                  t => t.persona === persona && t.phase !== "complete" && t.phase !== "failed"
                ).length;
                return (
                  <div
                    key={persona}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      activeCount > 0 
                        ? "bg-primary/10 text-primary border border-primary/30" 
                        : "bg-secondary/50 text-muted-foreground"
                    )}
                  >
                    <Bot className="h-4 w-4" />
                    {persona}
                    {activeCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                        {activeCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Live Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <div className="border-b border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Live Analysis Feed</h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {jobs.length} tasks
              </span>
            </div>

            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-3 opacity-50" />
                    <p className="text-sm">Connecting to real-time feed...</p>
                  </div>
                ) : displayedJobs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Radio className="h-8 w-8 mb-3 opacity-50" />
                    <p className="text-sm">Waiting for analysis tasks...</p>
                    <p className="text-xs mt-1">Run a prompt analysis to see live updates here</p>
                  </div>
                ) : (
                  displayedJobs.map((task, index) => {
                    const PhaseIcon = phaseIcons[task.phase];
                    const isComplete = task.phase === "complete";
                    
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -20, height: 0 }}
                        animate={{ opacity: 1, x: 0, height: "auto" }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                        className={cn(
                          "px-4 py-3 flex items-center gap-4 transition-colors",
                          isComplete && task.brand_mentioned && "bg-success/5",
                          isComplete && !task.brand_mentioned && "bg-destructive/5"
                        )}
                      >
                        {/* Status Indicator */}
                        <div className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full",
                          task.phase === "complete" 
                            ? task.brand_mentioned 
                              ? "bg-success/20 text-success" 
                              : "bg-destructive/20 text-destructive"
                            : task.phase === "failed"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-primary/20 text-primary"
                        )}>
                          {task.phase !== "complete" && task.phase !== "failed" ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <PhaseIcon className="h-5 w-5" />
                          )}
                        </div>

                        {/* Task Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground truncate">
                              {task.prompt_text}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {task.model}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {task.persona}
                            </Badge>
                            <span>•</span>
                            <span>{phaseLabels[task.phase]}</span>
                          </div>
                          {task.reasoning && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {task.reasoning}
                            </p>
                          )}
                        </div>

                        {/* Result */}
                        {isComplete && (
                          <div className="flex items-center gap-3">
                            {task.accuracy && (
                              <div className="text-right">
                                <div className="text-sm font-semibold text-foreground">
                                  {task.accuracy}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Accuracy
                                </div>
                              </div>
                            )}
                            <div className={cn(
                              "px-3 py-1 rounded-full text-xs font-medium",
                              task.brand_mentioned
                                ? task.sentiment === "positive"
                                  ? "bg-success/20 text-success"
                                  : task.sentiment === "negative"
                                  ? "bg-destructive/20 text-destructive"
                                  : "bg-warning/20 text-warning"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {task.brand_mentioned ? task.sentiment?.toUpperCase() : "NOT MENTIONED"}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
