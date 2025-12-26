import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Topic {
  topic: string;
  visibility: number;
  count: number;
}

interface TopicVisibilityProps {
  topics?: Topic[];
  loading?: boolean;
}

const defaultTopics: Topic[] = [
  { topic: "General", visibility: 0, count: 0 },
];

function getScoreColor(score: number): string {
  if (score >= 80) return "bg-success text-success-foreground";
  if (score >= 60) return "bg-primary text-primary-foreground";
  if (score >= 40) return "bg-warning text-warning-foreground";
  return "bg-muted text-muted-foreground";
}

export function TopicVisibility({ topics, loading }: TopicVisibilityProps) {
  const displayTopics = topics && topics.length > 0 ? topics : defaultTopics;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-6 w-40 mb-6" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Topic visibility</h3>
      </div>

      <div className="space-y-2">
        {displayTopics.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No topic data available. Add prompts with tags to see topic breakdown.
          </div>
        ) : (
          displayTopics.map((topic, index) => (
            <motion.div
              key={topic.topic}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * index }}
              className="group flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-secondary/50"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">{topic.topic}</span>
                <span className="text-xs text-muted-foreground">({topic.count} prompts)</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${getScoreColor(
                    topic.visibility
                  )}`}
                >
                  {topic.visibility}%
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}
