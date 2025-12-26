import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle,
  RefreshCw,
  Play,
  Trash2,
  Clock,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DeadLetterJob {
  id: string;
  job_type: string;
  payload: Record<string, any>;
  error_message: string;
  retry_count: number;
  created_at: string;
  completed_at: string;
}

export function DeadLetterQueuePanel() {
  const [jobs, setJobs] = useState<DeadLetterJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchDeadLetterJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("job_queue")
        .select("*")
        .eq("status", "dead_letter")
        .order("completed_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setJobs((data as DeadLetterJob[]) || []);
    } catch (err) {
      console.error("Failed to fetch dead letter jobs:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDeadLetterJobs();
  }, [fetchDeadLetterJobs]);

  const replayJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("job_queue")
        .update({
          status: "pending",
          retry_count: 0,
          error_message: null,
          scheduled_for: new Date().toISOString(),
          completed_at: null,
        })
        .eq("id", jobId);
      
      if (error) throw error;
      
      setJobs(prev => prev.filter(j => j.id !== jobId));
      toast({ title: "Job Replayed", description: "Job has been requeued for processing" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to replay job", variant: "destructive" });
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      const { error } = await supabase
        .from("job_queue")
        .delete()
        .eq("id", jobId);
      
      if (error) throw error;
      
      setJobs(prev => prev.filter(j => j.id !== jobId));
      toast({ title: "Job Deleted", description: "Job has been removed" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete job", variant: "destructive" });
    }
  };

  const replayAll = async () => {
    for (const job of jobs) {
      await replayJob(job.id);
    }
  };

  const deleteAll = async () => {
    try {
      const { error } = await supabase
        .from("job_queue")
        .delete()
        .eq("status", "dead_letter");
      
      if (error) throw error;
      
      setJobs([]);
      toast({ title: "All Jobs Deleted", description: "Dead letter queue cleared" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to clear queue", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Dead Letter Queue
          {jobs.length > 0 && (
            <Badge variant="destructive">{jobs.length}</Badge>
          )}
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={fetchDeadLetterJobs}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          {jobs.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={replayAll}>
                <Play className="h-4 w-4 mr-1" />
                Replay All
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear Dead Letter Queue?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {jobs.length} failed jobs. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteAll}>Delete All</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <XCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No failed jobs</p>
            <p className="text-sm">All jobs are processing successfully</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {jobs.map((job) => (
                <Collapsible
                  key={job.id}
                  open={expandedJob === job.id}
                  onOpenChange={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                >
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5">
                    <CollapsibleTrigger className="w-full p-3 flex items-center justify-between hover:bg-destructive/10 transition-colors">
                      <div className="flex items-center gap-3">
                        {expandedJob === job.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div className="text-left">
                          <p className="text-sm font-medium">{job.job_type}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {job.error_message}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {job.retry_count} retries
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(job.completed_at), "MMM d, HH:mm")}
                        </span>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-3 pb-3 space-y-3">
                        <div className="rounded bg-background p-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Error</p>
                          <p className="text-sm text-destructive">{job.error_message}</p>
                        </div>
                        
                        <div className="rounded bg-background p-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Payload</p>
                          <pre className="text-xs overflow-auto max-h-32">
                            {JSON.stringify(job.payload, null, 2)}
                          </pre>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => replayJob(job.id)}>
                            <Play className="h-3 w-3 mr-1" />
                            Replay
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deleteJob(job.id)}>
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
