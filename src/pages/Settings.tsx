import { useState } from "react";
import { motion } from "framer-motion";
import { Sidebar, useSidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Mail, 
  TrendingDown, 
  Users, 
  Calendar, 
  FileText, 
  Plus,
  Trash2,
  ToggleLeft,
  Eye,
  EyeOff,
  Loader2,
  Settings as SettingsIcon,
  Activity,
  Server
} from "lucide-react";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useCompetitors } from "@/hooks/useCompetitors";
import { useBrands } from "@/hooks/useBrands";
import { HealthCheck } from "@/components/settings/HealthCheck";
import { ScheduledAnalysisPanel } from "@/components/scheduled/ScheduledAnalysisPanel";
import { DeadLetterQueuePanel } from "@/components/dashboard/DeadLetterQueuePanel";
import { JobQueuePanel } from "@/components/dashboard/JobQueuePanel";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { settings, loading: settingsLoading, saving, updateSettings } = useNotificationSettings();
  const { competitors, loading: competitorsLoading, addCompetitor, deleteCompetitor, toggleActive } = useCompetitors();
  const { activeBrand } = useBrands();
  const [newCompetitor, setNewCompetitor] = useState("");
  const { isOpen } = useSidebar();

  const handleAddCompetitor = async () => {
    if (!newCompetitor.trim()) return;
    await addCompetitor(newCompetitor.trim(), activeBrand?.id);
    setNewCompetitor("");
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-background dark">
        <Sidebar />
        <main className={cn(
          "transition-all duration-200 ease-in-out",
          isOpen ? "pl-56" : "pl-0"
        )}>
          <Header title="Settings" breadcrumb={["FORZEO", "Settings"]} />
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      <Sidebar />
      
      <main className={cn(
        "transition-all duration-200 ease-in-out",
        isOpen ? "pl-56" : "pl-0"
      )}>
        <Header title="Settings" breadcrumb={["FORZEO", "Settings"]} />
        
        <div className="p-6">
          <Tabs defaultValue="notifications" className="space-y-6">
            <TabsList className="grid w-full max-w-3xl grid-cols-5">
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="competitors" className="gap-2">
                <Users className="h-4 w-4" />
                Competitors
              </TabsTrigger>
              <TabsTrigger value="schedule" className="gap-2">
                <Calendar className="h-4 w-4" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="operations" className="gap-2">
                <Server className="h-4 w-4" />
                Operations
              </TabsTrigger>
              <TabsTrigger value="health" className="gap-2">
                <Activity className="h-4 w-4" />
                Health
              </TabsTrigger>
            </TabsList>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Email Settings */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Email Notifications
                      </CardTitle>
                      <CardDescription>
                        Configure when and how you receive email alerts
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive alerts via email
                          </p>
                        </div>
                        <Switch
                          checked={settings?.email_enabled ?? true}
                          onCheckedChange={(checked) => updateSettings({ email_enabled: checked })}
                          disabled={saving}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-destructive" />
                            Visibility Drop Alerts
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Alert when visibility falls below threshold
                          </p>
                        </div>
                        <Switch
                          checked={settings?.visibility_drop_alert ?? true}
                          onCheckedChange={(checked) => updateSettings({ visibility_drop_alert: checked })}
                          disabled={saving || !settings?.email_enabled}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-warning" />
                            Competitor Overtake Alerts
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Alert when a competitor surpasses your ranking
                          </p>
                        </div>
                        <Switch
                          checked={settings?.competitor_overtake_alert ?? true}
                          onCheckedChange={(checked) => updateSettings({ competitor_overtake_alert: checked })}
                          disabled={saving || !settings?.email_enabled}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Threshold Settings */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <SettingsIcon className="h-5 w-5" />
                        Alert Thresholds
                      </CardTitle>
                      <CardDescription>
                        Configure when alerts should be triggered
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label>Visibility Threshold</Label>
                          <span className="text-2xl font-bold text-primary">
                            {settings?.visibility_threshold ?? 70}%
                          </span>
                        </div>
                        <Slider
                          value={[settings?.visibility_threshold ?? 70]}
                          onValueChange={([value]) => updateSettings({ visibility_threshold: value })}
                          min={0}
                          max={100}
                          step={5}
                          disabled={saving}
                          className="py-4"
                        />
                        <p className="text-sm text-muted-foreground">
                          You'll be alerted when your brand visibility drops below this percentage
                        </p>
                      </div>

                      <div className="rounded-lg border border-border bg-secondary/30 p-4">
                        <h4 className="mb-2 font-medium text-foreground">Current Status</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Email alerts</span>
                            <Badge variant={settings?.email_enabled ? "default" : "secondary"}>
                              {settings?.email_enabled ? "Enabled" : "Disabled"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Active competitors</span>
                            <Badge variant="outline">
                              {competitors.filter((c) => c.is_active).length} tracked
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </TabsContent>

            {/* Competitors Tab */}
            <TabsContent value="competitors">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Competitor Tracking
                    </CardTitle>
                    <CardDescription>
                      Monitor competitor brands and get alerts when they overtake your rankings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Add Competitor */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Input
                          placeholder="Enter competitor brand name..."
                          value={newCompetitor}
                          onChange={(e) => setNewCompetitor(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddCompetitor()}
                        />
                      </div>
                      <Button onClick={handleAddCompetitor} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Competitor
                      </Button>
                    </div>

                    {/* Competitors List */}
                    {competitorsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : competitors.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-8 text-center">
                        <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground">
                          No competitors added yet. Add a competitor to start tracking.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {competitors.map((competitor, index) => (
                          <motion.div
                            key={competitor.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={cn(
                              "flex items-center justify-between rounded-lg border border-border p-4 transition-colors",
                              competitor.is_active ? "bg-card" : "bg-secondary/30 opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                                  competitor.is_active
                                    ? "bg-primary/20 text-primary"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {competitor.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{competitor.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Last score: {competitor.last_visibility_score}%
                                  {competitor.last_rank && ` • Rank #${competitor.last_rank}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={competitor.is_active ? "default" : "secondary"}
                                className="cursor-pointer"
                                onClick={() => toggleActive(competitor.id)}
                              >
                                {competitor.is_active ? (
                                  <>
                                    <Eye className="mr-1 h-3 w-3" />
                                    Active
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="mr-1 h-3 w-3" />
                                    Paused
                                  </>
                                )}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteCompetitor(competitor.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule">
              <div className="space-y-6">
                {/* Scheduled Analysis Panel */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ScheduledAnalysisPanel />
                </motion.div>

                {/* Email Report Settings */}
                <div className="grid gap-6 md:grid-cols-2">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Email Reports
                        </CardTitle>
                        <CardDescription>
                          Configure automatic email reporting
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Daily Summary</Label>
                            <p className="text-sm text-muted-foreground">
                              Receive a daily visibility summary email
                            </p>
                          </div>
                          <Switch
                            checked={settings?.daily_summary_enabled ?? false}
                            onCheckedChange={(checked) => updateSettings({ daily_summary_enabled: checked })}
                            disabled={saving}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Weekly Report
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Comprehensive weekly visibility report
                            </p>
                          </div>
                          <Switch
                            checked={settings?.weekly_report_enabled ?? true}
                            onCheckedChange={(checked) => updateSettings({ weekly_report_enabled: checked })}
                            disabled={saving}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <SettingsIcon className="h-5 w-5" />
                          Background Analysis
                        </CardTitle>
                        <CardDescription>
                          Automatic daily analysis at midnight UTC
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="rounded-lg border border-border bg-success/10 p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
                              <Calendar className="h-5 w-5 text-success" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Daily Analysis Active</p>
                              <p className="text-sm text-muted-foreground">
                                All prompts analyzed every 24 hours
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 text-sm text-muted-foreground">
                          <p className="mb-2">Automatic analysis includes:</p>
                          <ul className="list-inside list-disc space-y-1">
                            <li>All tracked prompts</li>
                            <li>Competitor comparison</li>
                            <li>Visibility history tracking</li>
                            <li>Alert notifications</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </TabsContent>

            {/* Operations Tab - Job Queue & DLQ */}
            <TabsContent value="operations">
              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <JobQueuePanel maxHeight="350px" />
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <DeadLetterQueuePanel />
                </motion.div>
              </div>
            </TabsContent>

            {/* Health Check Tab */}
            <TabsContent value="health">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <HealthCheck />
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
