import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBrands } from "@/hooks/useBrands";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Bot,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonaMetrics {
  persona: string;
  mentions: number;
  avgAccuracy: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  totalAnalyses: number;
}

const PERSONAS = ["General User", "CTO", "Developer", "Student", "Investor", "Manager"];

export function PersonaComparisonReport() {
  const { user } = useAuth();
  const { activeBrand } = useBrands();
  const [metrics, setMetrics] = useState<PersonaMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<"chart" | "radar">("chart");

  const fetchPersonaMetrics = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Fetch analysis jobs grouped by persona
    const { data: jobs, error } = await supabase
      .from("analysis_jobs")
      .select("*")
      .eq("user_id", user.id)
      .eq("phase", "complete");

    if (error) {
      console.error("Error fetching jobs:", error);
      setLoading(false);
      return;
    }

    // Calculate metrics per persona
    const personaData: Record<string, PersonaMetrics> = {};
    
    PERSONAS.forEach(persona => {
      personaData[persona] = {
        persona,
        mentions: 0,
        avgAccuracy: 0,
        positiveCount: 0,
        neutralCount: 0,
        negativeCount: 0,
        totalAnalyses: 0,
      };
    });

    (jobs || []).forEach((job: any) => {
      const persona = job.persona || "General User";
      if (!personaData[persona]) {
        personaData[persona] = {
          persona,
          mentions: 0,
          avgAccuracy: 0,
          positiveCount: 0,
          neutralCount: 0,
          negativeCount: 0,
          totalAnalyses: 0,
        };
      }
      
      personaData[persona].totalAnalyses += 1;
      
      if (job.brand_mentioned) {
        personaData[persona].mentions += 1;
      }
      
      if (job.accuracy) {
        personaData[persona].avgAccuracy += job.accuracy;
      }
      
      if (job.sentiment === "positive") {
        personaData[persona].positiveCount += 1;
      } else if (job.sentiment === "negative") {
        personaData[persona].negativeCount += 1;
      } else if (job.sentiment === "neutral") {
        personaData[persona].neutralCount += 1;
      }
    });

    // Calculate averages
    const result = Object.values(personaData).map(p => ({
      ...p,
      avgAccuracy: p.totalAnalyses > 0 ? Math.round(p.avgAccuracy / p.totalAnalyses) : 0,
      mentionRate: p.totalAnalyses > 0 ? Math.round((p.mentions / p.totalAnalyses) * 100) : 0,
      positiveRate: p.mentions > 0 ? Math.round((p.positiveCount / p.mentions) * 100) : 0,
    }));

    setMetrics(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchPersonaMetrics();
  }, [user]);

  const chartData = metrics.map(m => ({
    name: m.persona,
    "Mention Rate": m.totalAnalyses > 0 ? Math.round((m.mentions / m.totalAnalyses) * 100) : 0,
    "Positive %": m.mentions > 0 ? Math.round((m.positiveCount / m.mentions) * 100) : 0,
    "Avg Accuracy": m.avgAccuracy,
    Analyses: m.totalAnalyses,
  }));

  const radarData = metrics.map(m => ({
    subject: m.persona,
    Visibility: m.totalAnalyses > 0 ? Math.round((m.mentions / m.totalAnalyses) * 100) : 0,
    Sentiment: m.mentions > 0 ? Math.round((m.positiveCount / m.mentions) * 100) : 0,
    Accuracy: m.avgAccuracy,
  }));

  const getBestPersona = () => {
    if (metrics.length === 0) return null;
    return metrics.reduce((best, current) => {
      const bestScore = best.totalAnalyses > 0 ? (best.mentions / best.totalAnalyses) * 100 : 0;
      const currentScore = current.totalAnalyses > 0 ? (current.mentions / current.totalAnalyses) * 100 : 0;
      return currentScore > bestScore ? current : best;
    });
  };

  const getWorstPersona = () => {
    if (metrics.length === 0) return null;
    const withData = metrics.filter(m => m.totalAnalyses > 0);
    if (withData.length === 0) return null;
    return withData.reduce((worst, current) => {
      const worstScore = (worst.mentions / worst.totalAnalyses) * 100;
      const currentScore = (current.mentions / current.totalAnalyses) * 100;
      return currentScore < worstScore ? current : worst;
    });
  };

  const bestPersona = getBestPersona();
  const worstPersona = getWorstPersona();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best Performing</p>
                <p className="font-semibold text-foreground">
                  {bestPersona?.persona || "N/A"}
                </p>
                {bestPersona && bestPersona.totalAnalyses > 0 && (
                  <p className="text-xs text-success">
                    {Math.round((bestPersona.mentions / bestPersona.totalAnalyses) * 100)}% visibility
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Needs Improvement</p>
                <p className="font-semibold text-foreground">
                  {worstPersona?.persona || "N/A"}
                </p>
                {worstPersona && worstPersona.totalAnalyses > 0 && (
                  <p className="text-xs text-destructive">
                    {Math.round((worstPersona.mentions / worstPersona.totalAnalyses) * 100)}% visibility
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Analyses</p>
                <p className="font-semibold text-foreground">
                  {metrics.reduce((sum, m) => sum + m.totalAnalyses, 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Across {PERSONAS.length} personas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Persona Comparison
            </CardTitle>
            <CardDescription>
              How different user personas perceive your brand
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPersonaMetrics}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
            <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="chart" className="text-xs">Bar Chart</TabsTrigger>
                <TabsTrigger value="radar" className="text-xs">Radar</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-80">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : metrics.reduce((sum, m) => sum + m.totalAnalyses, 0) === 0 ? (
            <div className="flex flex-col items-center justify-center h-80 text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-50" />
              <p>No persona analysis data yet.</p>
              <p className="text-sm">Run prompt analyses with different personas to see comparisons.</p>
            </div>
          ) : selectedView === "chart" ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="Mention Rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Positive %" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Avg Accuracy" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="Visibility" dataKey="Visibility" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                <Radar name="Sentiment" dataKey="Sentiment" stroke="hsl(var(--success))" fill="hsl(var(--success))" fillOpacity={0.3} />
                <Radar name="Accuracy" dataKey="Accuracy" stroke="hsl(var(--warning))" fill="hsl(var(--warning))" fillOpacity={0.3} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Persona Details */}
      <Card>
        <CardHeader>
          <CardTitle>Persona Breakdown</CardTitle>
          <CardDescription>Detailed metrics for each user persona</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metrics.map((m) => (
              <motion.div
                key={m.persona}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-border rounded-lg p-4 bg-secondary/20"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="font-medium">{m.persona}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Analyses</span>
                    <span className="font-medium">{m.totalAnalyses}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mentions</span>
                    <span className="font-medium text-primary">{m.mentions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Mention Rate</span>
                    <Badge variant={m.totalAnalyses > 0 && (m.mentions / m.totalAnalyses) > 0.5 ? "default" : "secondary"}>
                      {m.totalAnalyses > 0 ? Math.round((m.mentions / m.totalAnalyses) * 100) : 0}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sentiment</span>
                    <div className="flex items-center gap-1">
                      <span className="text-success">{m.positiveCount}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-warning">{m.neutralCount}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-destructive">{m.negativeCount}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
