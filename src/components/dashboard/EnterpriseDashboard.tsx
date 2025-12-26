import { useState } from "react";
import { cn } from "@/lib/utils";
import { AIVisibilityDashboard } from "./AIVisibilityDashboard";
import { EngineAuthorityPanel } from "./EngineAuthorityPanel";
import { WeeklyPrioritiesPanel } from "./WeeklyPrioritiesPanel";
import { SystemStatusBanner } from "./SystemStatusBanner";
import { useEngineAuthority } from "@/hooks/useEngineAuthority";
import { usePrioritizedInsights } from "@/hooks/usePrioritizedInsights";
import { useVisibilityData } from "@/hooks/useVisibilityData";
import { BarChart2, Target, Shield, Settings, Loader2 } from "lucide-react";

interface EnterpriseDashboardProps {
  brandId?: string;
  brandName: string;
}

type TabValue = "visibility" | "priorities" | "authority";

/**
 * Enterprise Dashboard - FORZEO Design System
 * All data is sourced from real database queries.
 * No mock data, no Math.random(), no hardcoded values.
 */
export function EnterpriseDashboard({
  brandId,
  brandName,
}: EnterpriseDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("visibility");

  const { engines, hasActiveOutages } = useEngineAuthority();
  const { weeklyPriorities } = usePrioritizedInsights(brandId);
  const {
    metrics,
    trendData,
    enginePerformance,
    loading,
    refresh,
  } = useVisibilityData(brandId);

  // Transform engine performance to the format expected by AIVisibilityDashboard
  const engineMetrics = enginePerformance.map((e) => ({
    engine: e.engine,
    visibility: e.visibility ?? 0,
    citations: e.citations,
    sentiment: "neutral" as const,
    trend: e.trend ?? 0,
    authorityWeight: e.authorityWeight,
    status: e.status,
    weightedScore: e.visibility != null ? Math.round(e.visibility * e.authorityWeight) : 0,
  }));

  // Determine degraded engines from real data
  const degradedEngines = engines
    .filter((e) => e.status === "degraded" || e.status === "unavailable")
    .map((e) => e.display_name);

  // Calculate confidence level from real metrics
  const confidenceLevel = metrics.confidenceLevel;

  const tabs = [
    {
      id: "visibility" as const,
      label: "AI Visibility",
      icon: BarChart2,
      badge: null,
    },
    {
      id: "priorities" as const,
      label: "What to Fix",
      icon: Target,
      badge: weeklyPriorities.length > 0 ? weeklyPriorities.length : null,
    },
    {
      id: "authority" as const,
      label: "Engine Authority",
      icon: Shield,
      badge: hasActiveOutages ? "!" : null,
      badgeVariant: hasActiveOutages ? "warning" : "default",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-page-title text-foreground">{brandName}</h1>
              <p className="text-body-sm text-muted-foreground mt-1">
                AI Search Visibility Analytics
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refresh}
                disabled={loading}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-fz"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <nav className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-body-sm font-medium rounded-t-lg transition-colors duration-fz border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "text-foreground border-fz-blue bg-card"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.badge && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] font-medium rounded-full",
                      tab.badgeVariant === "warning"
                        ? "bg-fz-amber/10 text-fz-amber"
                        : "bg-fz-blue/10 text-fz-blue"
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* System Status Banner */}
      <SystemStatusBanner />

      {/* Main Content */}
      <main className="p-6">
        {activeTab === "visibility" && (
          <AIVisibilityDashboard
            brandName={brandName}
            overallScore={metrics.aiVisibilityScore ?? 0}
            weightedScore={metrics.aiVisibilityScore ?? undefined}
            citationScore={metrics.citationScore ?? 0}
            authorityScore={metrics.authorityScore ?? 0}
            shareOfVoice={metrics.shareOfVoice ?? 0}
            engineMetrics={engineMetrics}
            trendData={trendData}
            loading={loading}
            onRefresh={refresh}
            isEstimated={metrics.isEstimated}
            confidenceLevel={confidenceLevel}
            degradedEngines={degradedEngines}
            lowAuthorityImpact={
              degradedEngines.length > 0
                ? `Scores affected by ${degradedEngines.length} degraded engine(s)`
                : undefined
            }
            scoreDelta={metrics.scoreDelta}
            citationDelta={metrics.citationDelta}
            authorityDelta={metrics.authorityDelta}
            sovDelta={metrics.sovDelta}
            dataAvailable={metrics.dataAvailable}
          />
        )}

        {activeTab === "priorities" && (
          <WeeklyPrioritiesPanel brandId={brandId} />
        )}

        {activeTab === "authority" && <EngineAuthorityPanel />}
      </main>
    </div>
  );
}
