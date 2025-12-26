import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Model {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const models: Model[] = [
  { id: "all", name: "All LLMs", icon: "✨", color: "bg-primary" },
  { id: "chatgpt", name: "ChatGPT", icon: "🤖", color: "bg-emerald-500" },
  { id: "ai-overview", name: "AI Overview", icon: "🔍", color: "bg-blue-500" },
  { id: "gemini", name: "Gemini", icon: "💎", color: "bg-purple-500" },
  { id: "perplexity", name: "Perplexity", icon: "🔮", color: "bg-cyan-500" },
  { id: "claude", name: "Claude", icon: "🧠", color: "bg-orange-500" },
];

interface ModelFilterProps {
  className?: string;
}

export function ModelFilter({ className }: ModelFilterProps) {
  const [selected, setSelected] = useState("all");

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {models.map((model) => (
        <motion.button
          key={model.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setSelected(model.id)}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
            selected === model.id
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          <span
            className={cn(
              "flex h-2 w-2 rounded-full",
              selected === model.id ? "bg-primary-foreground" : model.color
            )}
          />
          {model.name}
        </motion.button>
      ))}
    </div>
  );
}
