import { motion } from "framer-motion";
import { Star, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Competitor {
  name: string;
  score: number;
  isYou?: boolean;
}

const competitors: Competitor[] = [
  { name: "FORZEO", score: 54.2, isYou: true },
  { name: "ASOS", score: 33.9 },
  { name: "Selfridges", score: 29.7 },
  { name: "John Lewis", score: 27.2 },
  { name: "Gucci", score: 25.6 },
  { name: "Harrods", score: 25.3 },
  { name: "Farfetch", score: 25.3 },
  { name: "Flannels", score: 21.4 },
  { name: "Tom Ford", score: 20.6 },
  { name: "Hugo Boss", score: 18.9 },
];

export function CompetitorList() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <div className="mb-6 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-foreground">
          Most mentioned competitors
        </h3>
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        {competitors.map((competitor, index) => (
          <motion.div
            key={competitor.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.03 * index }}
            className={cn(
              "flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-secondary/50",
              competitor.isYou && "bg-primary/5"
            )}
          >
            <div className="flex items-center gap-2">
              {competitor.isYou && (
                <Star className="h-4 w-4 fill-warning text-warning" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  competitor.isYou ? "text-primary" : "text-foreground"
                )}
              >
                {competitor.name}
              </span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              {competitor.score}%
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
