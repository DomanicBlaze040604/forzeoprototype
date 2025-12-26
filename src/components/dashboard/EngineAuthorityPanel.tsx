import { useState } from "react";
import { cn } from "@/lib/utils";
import { ForzeoStatusBadge } from "./ForzeoStatusBadge";
import {
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import {
  useEngineAuthority,
  EngineAuthority,
} from "@/hooks/useEngineAuthority";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const STATUS_CONFIG = {
  healthy: {
    icon: CheckCircle,
    color: "text-fz-green",
    bg: "bg-fz-green/10",
    label: "Healthy",
  },
  degraded: {
    icon: AlertCircle,
    color: "text-fz-amber",
    bg: "bg-fz-amber/10",
    label: "Degraded",
  },
  unavailable: {
    icon: XCircle,
    color: "text-fz-red",
    bg: "bg-fz-red/10",
    label: "Unavailable",
  },
  maintenance: {
    icon: Clock,
    color: "text-fz-blue",
    bg: "bg-fz-blue/10",
    label: "Maintenance",
  },
};

interface AuthorityExplanation {
  engine: string;
  currentWeight: number;
  trustLevel: "high" | "medium" | "low";
  whyTrustworthy: string[];
  whyCautious: string[];
  recentChanges: Array<{
    date: string;
    change: string;
    impact: number;
  }>;
  comparedToOthers: string;
}

interface EngineCardProps {
  engine: EngineAuthority;
  expanded: boolean;
  onToggle: () => void;
  onExplain: () => void;
}

function EngineCard({ engine, expanded, onToggle, onExplain }: EngineCardProps) {
  const status = STATUS_CONFIG[engine.status];
  const StatusIcon = status.icon;

  const authorityLevel =
    engine.authority_weight >= 1.1
      ? "high"
      : engine.authority_weight >= 0.9
      ? "normal"
      : "low";

  return (
    <div
      className={cn(
        "fz-card overflow-hidden transition-all duration-fz cursor-pointer",
        expanded && "ring-1 ring-fz-blue/30"
      )}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", status.bg)}>
              <StatusIcon className={cn("h-4 w-4", status.color)} />
            </div>
            <div>
              <h4 className="text-body-sm font-medium text-foreground">
                {engine.display_name}
              </h4>
              <p className="text-meta text-muted-foreground">{status.label}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Shield
                className={cn(
                  "h-4 w-4",
                  authorityLevel === "high"
                    ? "text-fz-green"
                    : authorityLevel === "low"
                    ? "text-fz-red"
                    : "text-muted-foreground"
                )}
              />
              <span
                className={cn(
                  "text-[18px] font-semibold tabular-nums",
                  authorityLevel === "high"
                    ? "text-fz-green"
                    : authorityLevel === "low"
                    ? "text-fz-red"
                    : "text-foreground"
                )}
              >
                {(engine.authority_weight * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-meta text-muted-foreground">Authority</p>
          </div>
        </div>

        {/* Quick metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-secondary/30">
            <p className="text-body-sm font-medium tabular-nums">
              {engine.reliability_score.toFixed(0)}%
            </p>
            <p className="text-meta text-muted-foreground">Reliability</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-secondary/30">
            <p className="text-body-sm font-medium tabular-nums">
              {engine.citation_completeness.toFixed(0)}%
            </p>
            <p className="text-meta text-muted-foreground">Citations</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-secondary/30">
            <p className="text-body-sm font-medium tabular-nums">
              {engine.freshness_index.toFixed(0)}%
            </p>
            <p className="text-meta text-muted-foreground">Freshness</p>
          </div>
        </div>

        {/* Expand indicator */}
        <div className="flex justify-center mt-3 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border space-y-3">
          <div className="grid grid-cols-2 gap-4 text-body-sm">
            <div>
              <p className="text-muted-foreground">Total queries</p>
              <p className="font-medium tabular-nums">
                {engine.total_queries.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg response</p>
              <p className="font-medium tabular-nums">
                {engine.avg_response_time_ms}ms
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Last success</p>
              <p className="font-medium">
                {engine.last_successful_query
                  ? formatDistanceToNow(new Date(engine.last_successful_query), {
                      addSuffix: true,
                    })
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Consecutive failures</p>
              <p
                className={cn(
                  "font-medium tabular-nums",
                  engine.consecutive_failures > 0
                    ? "text-fz-red"
                    : "text-fz-green"
                )}
              >
                {engine.consecutive_failures}
              </p>
            </div>
          </div>

          {engine.status_message && (
            <div className="p-2 rounded-lg bg-fz-amber/5 border border-fz-amber/20 text-body-sm text-fz-amber">
              {engine.status_message}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onExplain();
            }}
            className="w-full fz-button-secondary flex items-center justify-center gap-2"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Why should I trust this engine?
          </button>

          <p className="text-meta text-muted-foreground">
            Authority weight affects how much this engine contributes to your
            overall AVS score.
            {authorityLevel === "low" &&
              " Low authority means drops on this engine have less impact."}
            {authorityLevel === "high" &&
              " High authority means this engine significantly impacts your score."}
          </p>
        </div>
      )}
    </div>
  );
}

export function EngineAuthorityPanel() {
  const {
    engines,
    outages,
    loading,
    overallHealth,
    hasActiveOutages,
    fetchEngineAuthority,
  } = useEngineAuthority();

  const [expandedEngine, setExpandedEngine] = useState<string | null>(null);
  const [explanationDialog, setExplanationDialog] = useState<{
    open: boolean;
    engine: string | null;
    explanation: AuthorityExplanation | null;
    loading: boolean;
  }>({ open: false, engine: null, explanation: null, loading: false });

  const fetchExplanation = async (engine: string) => {
    setExplanationDialog({
      open: true,
      engine,
      explanation: null,
      loading: true,
    });

    try {
      const { data, error } = await supabase.functions.invoke(
        "engine-authority",
        {
          body: { action: "explainAuthority", engine },
        }
      );

      if (error) throw error;

      setExplanationDialog((prev) => ({
        ...prev,
        explanation: data.explanation,
        loading: false,
      }));
    } catch (err) {
      console.error("Failed to fetch explanation:", err);
      setExplanationDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-header text-foreground">
            Engine Authority
          </h2>
          <p className="text-meta text-muted-foreground mt-0.5">
            Trust metrics for each AI engine
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p
              className={cn(
                "text-[24px] font-semibold tabular-nums",
                overallHealth >= 80
                  ? "text-fz-green"
                  : overallHealth >= 50
                  ? "text-fz-amber"
                  : "text-fz-red"
              )}
            >
              {overallHealth}%
            </p>
            <p className="text-meta text-muted-foreground">System health</p>
          </div>
          <button
            onClick={fetchEngineAuthority}
            disabled={loading}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-fz"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Active outages */}
      {hasActiveOutages && (
        <div className="fz-card p-4 bg-fz-red/5 border-fz-red/20">
          <div className="flex items-center gap-2 text-fz-red mb-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-body-sm font-medium">Active Outages</span>
          </div>
          <div className="space-y-1">
            {outages.map((outage) => (
              <div
                key={outage.id}
                className="flex items-center justify-between text-body-sm"
              >
                <span className="text-foreground">{outage.display_name}</span>
                <span className="text-muted-foreground">
                  Started{" "}
                  {formatDistanceToNow(new Date(outage.started_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            ))}
          </div>
          <p className="text-meta text-muted-foreground mt-2">
            Scores for affected engines are estimated using last known good
            data.
          </p>
        </div>
      )}

      {/* Engine cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {engines.map((engine) => (
          <EngineCard
            key={engine.engine}
            engine={engine}
            expanded={expandedEngine === engine.engine}
            onToggle={() =>
              setExpandedEngine(
                expandedEngine === engine.engine ? null : engine.engine
              )
            }
            onExplain={() => fetchExplanation(engine.engine)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-3 border-t border-border text-meta text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-fz-green" />
          <span>High authority (110%+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-muted-foreground" />
          <span>Normal (90-110%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-fz-red" />
          <span>Low authority (&lt;90%)</span>
        </div>
      </div>

      {/* Explanation Dialog */}
      {explanationDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() =>
              setExplanationDialog((prev) => ({ ...prev, open: false }))
            }
          />
          <div className="relative fz-card-elevated max-w-lg w-full mx-4 p-6 animate-fz-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-section-header text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-fz-blue" />
                Why Trust{" "}
                {
                  engines.find((e) => e.engine === explanationDialog.engine)
                    ?.display_name
                }
                ?
              </h3>
              <button
                onClick={() =>
                  setExplanationDialog((prev) => ({ ...prev, open: false }))
                }
                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-fz"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {explanationDialog.loading ? (
              <div className="py-8 text-center text-muted-foreground">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-body-sm">Analyzing engine authority...</p>
              </div>
            ) : explanationDialog.explanation ? (
              <div className="space-y-4">
                {/* Trust Level */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <span className="text-body-sm font-medium">Trust Level</span>
                  <ForzeoStatusBadge
                    variant={
                      explanationDialog.explanation.trustLevel === "high"
                        ? "verified"
                        : explanationDialog.explanation.trustLevel === "low"
                        ? "hallucinated"
                        : "partial"
                    }
                  >
                    {explanationDialog.explanation.trustLevel.toUpperCase()}
                  </ForzeoStatusBadge>
                </div>

                {/* Why Trustworthy */}
                {explanationDialog.explanation.whyTrustworthy.length > 0 && (
                  <div>
                    <p className="text-body-sm font-medium text-fz-green mb-2 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Why you CAN trust this engine
                    </p>
                    <ul className="space-y-1">
                      {explanationDialog.explanation.whyTrustworthy.map(
                        (reason, i) => (
                          <li
                            key={i}
                            className="text-body-sm text-muted-foreground pl-5"
                          >
                            • {reason}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {/* Why Cautious */}
                {explanationDialog.explanation.whyCautious.length > 0 && (
                  <div>
                    <p className="text-body-sm font-medium text-fz-amber mb-2 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Why to be CAUTIOUS
                    </p>
                    <ul className="space-y-1">
                      {explanationDialog.explanation.whyCautious.map(
                        (reason, i) => (
                          <li
                            key={i}
                            className="text-body-sm text-muted-foreground pl-5"
                          >
                            • {reason}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {/* Comparison */}
                <div className="text-body-sm text-muted-foreground p-3 rounded-lg bg-secondary/30">
                  {explanationDialog.explanation.comparedToOthers}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                Failed to load explanation.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
