import { motion } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Brand {
  rank: number;
  name: string;
  logo: string;
  change: number;
  score: number;
}

const brands: Brand[] = [
  { rank: 1, name: "Chase", logo: "🏦", change: 5, score: 92 },
  { rank: 2, name: "Rho", logo: "📊", change: 1, score: 89.8 },
  { rank: 3, name: "American Express", logo: "💳", change: -1, score: 85.2 },
  { rank: 4, name: "Capital on Tap", logo: "💰", change: 5, score: 78 },
  { rank: 5, name: "US bank", logo: "🏛️", change: -2, score: 76.9 },
  { rank: 6, name: "Bill", logo: "📄", change: 1.8, score: 72.3 },
];

export function BrandRanking() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-xl border border-border bg-card p-6"
    >
      <h3 className="mb-6 text-lg font-semibold text-foreground">
        Brand Industry Ranking
      </h3>

      <div className="space-y-3">
        {brands.map((brand, index) => (
          <motion.div
            key={brand.name}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 * index }}
            className={cn(
              "flex items-center justify-between rounded-lg p-3 transition-colors",
              brand.rank === 2 && "bg-primary/10 ring-1 ring-primary/30"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center text-sm font-medium text-muted-foreground">
                {brand.rank}
              </span>
              <span className="text-xl">{brand.logo}</span>
              <span
                className={cn(
                  "font-medium",
                  brand.rank === 2 ? "text-primary" : "text-foreground"
                )}
              >
                {brand.name}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span
                className={cn(
                  "flex items-center gap-0.5 text-sm font-medium",
                  brand.change > 0 && "text-success",
                  brand.change < 0 && "text-destructive"
                )}
              >
                {brand.change > 0 ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                {Math.abs(brand.change)}%
              </span>
              <span className="min-w-[60px] text-right font-semibold text-foreground">
                {brand.score}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
