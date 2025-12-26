import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useScheduledAnalysis } from "@/hooks/useScheduledAnalysis";
import { useBrands } from "@/hooks/useBrands";
import {
  Calendar,
  Clock,
  Play,
  Pause,
  Trash2,
  Plus,
  Loader2,
  Users,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PERSONAS = [
  "General User",
  "CTO",
  "Developer",
  "Student",
  "Investor",
  "Manager",
];

export function ScheduledAnalysisPanel() {
  const { activeBrand } = useBrands();
  const {
    schedules,
    loading,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    runNow,
    running,
  } = useScheduledAnalysis();

  const [showCreate, setShowCreate] = useState(false);
  const [scheduleType, setScheduleType] = useState("daily");
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(PERSONAS);

  const handleCreate = async () => {
    if (!activeBrand) return;
    await createSchedule(activeBrand.id, scheduleType, selectedPersonas);
    setShowCreate(false);
  };

  const togglePersona = (persona: string) => {
    setSelectedPersonas((prev) =>
      prev.includes(persona)
        ? prev.filter((p) => p !== persona)
        : [...prev, persona]
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Scheduled Analysis
            </CardTitle>
            <CardDescription>
              Automatically run prompts through all personas and generate comparison reports
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowCreate(!showCreate)}
            variant={showCreate ? "secondary" : "default"}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showCreate ? "Cancel" : "New Schedule"}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Create New Schedule */}
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border border-border rounded-lg p-4 mb-4 bg-secondary/30"
            >
              <h4 className="font-medium mb-3">Create New Schedule</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Frequency
                  </label>
                  <Select value={scheduleType} onValueChange={setScheduleType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily (9:00 AM)</SelectItem>
                      <SelectItem value="weekly">Weekly (Monday 9:00 AM)</SelectItem>
                      <SelectItem value="monthly">Monthly (1st at 9:00 AM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Personas to Analyze
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PERSONAS.map((persona) => (
                      <div
                        key={persona}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={persona}
                          checked={selectedPersonas.includes(persona)}
                          onCheckedChange={() => togglePersona(persona)}
                        />
                        <label
                          htmlFor={persona}
                          className="text-sm cursor-pointer"
                        >
                          {persona}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={!activeBrand || selectedPersonas.length === 0}
                  className="w-full"
                >
                  Create Schedule
                </Button>
              </div>
            </motion.div>
          )}

          {/* Existing Schedules */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No scheduled analyses yet.</p>
              <p className="text-sm">
                Create a schedule to automatically run analysis across all personas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <motion.div
                  key={schedule.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "border rounded-lg p-4 transition-colors",
                    schedule.is_active
                      ? "border-primary/30 bg-primary/5"
                      : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          schedule.is_active
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">
                            {schedule.schedule_type} Analysis
                          </span>
                          <Badge
                            variant={schedule.is_active ? "default" : "secondary"}
                          >
                            {schedule.is_active ? "Active" : "Paused"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Users className="h-3 w-3" />
                          <span>{schedule.personas?.length || 0} personas</span>
                          <span>•</span>
                          {schedule.next_run_at && (
                            <span>
                              Next: {new Date(schedule.next_run_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => runNow(schedule.id)}
                        disabled={running}
                      >
                        {running ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-2">Run Now</span>
                      </Button>
                      
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={(checked) =>
                          updateSchedule(schedule.id, { is_active: checked })
                        }
                      />
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSchedule(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {schedule.last_run_at && (
                    <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                      Last run: {new Date(schedule.last_run_at).toLocaleString()}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
