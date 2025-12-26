import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ForzeoStatusBadge } from "./ForzeoStatusBadge";
import {
  Target,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  ChevronUp,
} from "lucide-react";
import {
  usePrioritizedInsights,
  PrioritizedInsight,
} from "@/hooks/usePrioritizedInsights";

const EFFORT_CONFIG = {
  low: { label: "Quick win", time: "< 1 hour" },
  medium: { label: "Half day", time: "2-4 hours" },
  high: { label: "Project", time: "1+ days" },
};

interface PriorityCardProps {
  insight: PrioritizedInsight;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
  onAcknowledge: () => void;
  onComplete: () => void;
  onDismiss: () => void;
}

function PriorityCard({
  insight,
  rank,
  expanded,
  onToggle,
  onAcknowledge,
  onComplete,
  onDismiss,
}: PriorityCardProps) {
  const effortConfig = EFFORT_CONFIG[insight.estimated_effort];

  return (
    <div
      className={cn(
        "fz-card overflow-hidden transition-all duration-fz",
        expanded && "ring-1 ring-fz-blue/30",
        insight.status === "completed" && "opacity-60"
      )}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 text-left focus:outline-none"
      >
        <div className="flex items-start gap-4">
          {/* Rank */}
          <div
            className={cn(
              "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-body-sm font-semibold",
              rank === 1
                ? "bg-fz-blue text-white"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {rank}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-body-sm font-medium text-foreground truncate">
                {insight.title}
              </h4>
              {insight.status === "completed" && (
                <CheckCircle className="h-3.5 w-3.5 text-fz-green flex-shrink-0" />
              )}
            </div>
            <p className="text-meta text-muted-foreground line-clamp-2">
              {insight.description}
            </p>

            {/* Quick metrics */}
            <div className="flex items-center gap-3 mt-2">
              <ForzeoStatusBadge variant="neutral">
                {effortConfig.label}
              </ForzeoStatusBadge>
              <span className="text-meta text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />+{insight.estimated_upside}%
              </span>
              <span className="text-meta text-muted-foreground tabular-nums">
                {insight.confidence_score}% confidence
              </span>
            </div>
          </div>

          {/* Expand */}
          <div className="flex-shrink-0 text-muted-foreground">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border space-y-4">
          {/* Impact */}
          <div className="p-3 rounded-lg bg-secondary/50">
            <p className="text-meta font-medium text-foreground mb-1">
              Why this matters
            </p>
            <p className="text-body-sm text-muted-foreground">
              {insight.impact_explanation}
            </p>
          </div>

          {/* Action */}
          <div>
            <p className="text-meta font-medium text-foreground mb-1">
              Recommended action
            </p>
            <p className="text-body-sm text-muted-foreground">
              {insight.recommended_action}
            </p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-2">
            {[
              {
                label: "Severity",
                value: insight.severity_score,
                color: "text-fz-red",
              },
              {
                label: "Confidence",
                value: insight.confidence_score,
                color: "text-fz-blue",
              },
              {
                label: "Upside",
                value: `+${insight.estimated_upside}`,
                color: "text-fz-green",
              },
              {
                label: "Priority",
                value: insight.priority_rank,
                color: "text-foreground",
              },
            ].map((metric) => (
              <div
                key={metric.label}
                className="text-center p-2 rounded-lg bg-secondary/30"
              >
                <p className={cn("text-[18px] font-semibold tabular-nums", metric.color)}>
                  {metric.value}
                </p>
                <p className="text-meta text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          {insight.status !== "completed" && (
            <div className="flex gap-2 pt-2">
              {insight.status === "new" && (
                <button
                  onClick={onAcknowledge}
                  className="fz-button-primary flex items-center gap-1.5"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Start working
                </button>
              )}
              <button
                onClick={onComplete}
                className="fz-button-secondary flex items-center gap-1.5"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Mark complete
              </button>
              <button onClick={onDismiss} className="fz-button-ghost">
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface WeeklyPrioritiesPanelProps {
  brandId?: string;
  showAllLink?: boolean;
}

export function WeeklyPrioritiesPanel({
  brandId,
  showAllLink = true,
}: WeeklyPrioritiesPanelProps) {
  const {
    weeklyPriorities,
    allInsights,
    loading,
    newInsightsCount,
    fetchWeeklyPriorities,
    acknowledgeInsight,
    completeInsight,
    dismissInsight,
  } = usePrioritizedInsights(brandId);

  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [oneThingStatement, setOneThingStatement] = useState<string>("");

  useEffect(() => {
    if (weeklyPriorities.length > 0) {
      const top = weeklyPriorities[0];
      const statement = top.single_action_summary || top.recommended_action;
      setOneThingStatement(statement);
    }
  }, [weeklyPriorities]);

  const displayedInsights = showAll ? allInsights : weeklyPriorities;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-section-header text-foreground">
            What to Fix This Week
          </h2>
          <p className="text-meta text-muted-foreground mt-0.5">
            Actions ranked by impact and effort
          </p>
        </div>
        <div className="flex items-center gap-2">
          {newInsightsCount > 0 && (
            <ForzeoStatusBadge variant="info">{newInsightsCount} new</ForzeoStatusBadge>
          )}
          <button
            onClick={() => fetchWeeklyPriorities()}
            disabled={loading}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-fz"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* The One Thing */}
      {weeklyPriorities.length > 0 && (
        <div className="fz-card p-4 bg-fz-blue/5 border-fz-blue/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-fz-blue flex items-center justify-center">
              <Target className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-meta font-medium text-fz-blue uppercase tracking-wide">
                The One Thing
              </p>
              <p className="text-body-sm text-foreground mt-1">
                {oneThingStatement}
              </p>
              {weeklyPriorities[0]?.opportunity_cost && (
                <div className="flex items-center gap-1.5 mt-2 text-meta text-fz-amber">
                  <AlertCircle className="h-3 w-3" />
                  {weeklyPriorities[0].opportunity_cost}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Priority List */}
      {displayedInsights.length === 0 ? (
        <div className="fz-card p-8 text-center">
          <CheckCircle className="h-10 w-10 mx-auto mb-3 text-fz-green opacity-50" />
          <p className="text-body-sm font-medium text-foreground">All caught up</p>
          <p className="text-meta text-muted-foreground mt-1">
            No priority actions right now
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedInsights.map((insight, index) => (
            <PriorityCard
              key={insight.id}
              insight={insight}
              rank={index + 1}
              expanded={expandedInsight === insight.id}
              onToggle={() =>
                setExpandedInsight(
                  expandedInsight === insight.id ? null : insight.id
                )
              }
              onAcknowledge={() => acknowledgeInsight(insight.id)}
              onComplete={() => completeInsight(insight.id)}
              onDismiss={() => dismissInsight(insight.id)}
            />
          ))}

          {showAllLink && allInsights.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-body-sm text-muted-foreground hover:text-foreground transition-colors duration-fz"
            >
              {showAll
                ? "Show top 3 only"
                : `View all ${allInsights.length} insights`}
            </button>
          )}
        </div>
      )}

      {/* Formula explanation */}
      <div className="pt-3 border-t border-border">
        <p className="text-meta text-muted-foreground">
          Priority = (Severity × 35%) + (Confidence × 25%) + (Effort × 20%) +
          (Upside × 20%)
        </p>
      </div>
    </div>
  );
}
