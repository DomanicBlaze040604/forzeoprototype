import { useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListTodo,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useJobQueue, Job } from "@/hooks/useJobQueue";
import { formatDistanceToNow } from "date-fns";

interface JobQueuePanelProps {
  maxHeight?: string;
}

const statusConfig: Record<Job["status"], { icon: React.ElementType; color: string; bg: string }> = {
  pending: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted" },
  processing: { icon: Loader2, color: "text-primary", bg: "bg-primary/20" },
  completed: { icon: CheckCircle2, color: "text-success", bg: "bg-success/20" },
  failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/20" },
  dead_letter: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/20" },
};

export function JobQueuePanel({ maxHeight = "400px" }: JobQueuePanelProps) {
  const { jobs, loading, fetchJobs, cancelJob, retryJob, getJobStats } = useJobQueue();

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const stats = getJobStats();
  const completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  if (loading && jobs.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-primary" />
              Job Queue
            </CardTitle>
            <CardDescription>
              Background analysis tasks and orchestration
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchJobs()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Overview */}
          <div className="grid grid-cols-5 gap-2">
            <div className="rounded-lg bg-secondary/30 p-2 text-center">
              <p className="text-lg font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2 text-center">
              <p className="text-lg font-bold text-muted-foreground">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2 text-center">
              <p className="text-lg font-bold text-primary">{stats.processing}</p>
              <p className="text-xs text-muted-foreground">Running</p>
            </div>
            <div className="rounded-lg bg-success/10 p-2 text-center">
              <p className="text-lg font-bold text-success">{stats.completed}</p>
              <p className="text-xs text-muted-foreground">Done</p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-2 text-center">
              <p className="text-lg font-bold text-destructive">{stats.failed}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>

          {/* Completion Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="font-medium text-foreground">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>

          {/* Job List */}
          <ScrollArea style={{ maxHeight }}>
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ListTodo className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No jobs in queue</p>
                <p className="text-sm">Jobs will appear here when analysis is scheduled</p>
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.slice(0, 20).map((job, index) => {
                  const config = statusConfig[job.status];
                  const StatusIcon = config.icon;
                  
                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "rounded-lg border border-border p-3 transition-colors hover:bg-secondary/20"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={cn("rounded-full p-1.5", config.bg)}>
                            <StatusIcon
                              className={cn(
                                "h-4 w-4",
                                config.color,
                                job.status === "processing" && "animate-spin"
                              )}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground truncate">
                                {job.job_type}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {job.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {job.payload?.prompt_text?.substring(0, 50) || 
                               job.payload?.engine || 
                               "No details"}
                              {job.payload?.prompt_text?.length > 50 && "..."}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                          </span>
                          {job.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => cancelJob(job.id)}
                            >
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                          {(job.status === "failed" || job.status === "dead_letter") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => retryJob(job.id)}
                            >
                              <RotateCcw className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {job.error_message && (
                        <p className="mt-2 text-xs text-destructive truncate">
                          Error: {job.error_message}
                        </p>
                      )}
                      {job.retry_count > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Retries: {job.retry_count}/{job.max_retries}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Dead Letter Queue Warning */}
          {stats.deadLetter > 0 && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-warning">
                  {stats.deadLetter} job(s) in dead letter queue
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                These jobs failed after maximum retries. Review and retry manually.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
