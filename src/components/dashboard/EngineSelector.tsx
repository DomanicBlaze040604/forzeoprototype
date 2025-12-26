import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Bot, ChevronDown, Check } from "lucide-react";

export type AIEngine = 
  | "google_ai_mode"
  | "chatgpt"
  | "perplexity"
  | "bing_copilot"
  | "gemini"
  | "claude";

interface EngineConfig {
  id: AIEngine;
  name: string;
  shortName: string;
  color: string;
  icon?: string;
  description: string;
  supported: boolean;
}

export const AI_ENGINES: EngineConfig[] = [
  {
    id: "google_ai_mode",
    name: "Google AI Mode / SGE",
    shortName: "Google AI",
    color: "bg-red-500",
    description: "Google's AI-powered search experience",
    supported: true,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    shortName: "ChatGPT",
    color: "bg-emerald-500",
    description: "OpenAI's conversational AI",
    supported: true,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    shortName: "Perplexity",
    color: "bg-cyan-500",
    description: "AI-powered answer engine",
    supported: true,
  },
  {
    id: "bing_copilot",
    name: "Bing Copilot",
    shortName: "Copilot",
    color: "bg-indigo-500",
    description: "Microsoft's AI assistant",
    supported: true,
  },
  {
    id: "gemini",
    name: "Gemini",
    shortName: "Gemini",
    color: "bg-blue-500",
    description: "Google's multimodal AI",
    supported: true,
  },
  {
    id: "claude",
    name: "Claude",
    shortName: "Claude",
    color: "bg-orange-500",
    description: "Anthropic's AI assistant",
    supported: true,
  },
];

interface EngineSelectorProps {
  selectedEngines: AIEngine[];
  onSelectionChange: (engines: AIEngine[]) => void;
  disabled?: boolean;
  showLabels?: boolean;
}

export function EngineSelector({
  selectedEngines,
  onSelectionChange,
  disabled = false,
  showLabels = true,
}: EngineSelectorProps) {
  const [open, setOpen] = useState(false);

  const toggleEngine = (engineId: AIEngine) => {
    if (selectedEngines.includes(engineId)) {
      onSelectionChange(selectedEngines.filter((e) => e !== engineId));
    } else {
      onSelectionChange([...selectedEngines, engineId]);
    }
  };

  const selectAll = () => {
    onSelectionChange(AI_ENGINES.filter((e) => e.supported).map((e) => e.id));
  };

  const selectNone = () => {
    onSelectionChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 min-w-[200px] justify-between"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span>
              {selectedEngines.length === 0
                ? "Select Engines"
                : selectedEngines.length === AI_ENGINES.length
                ? "All Engines"
                : `${selectedEngines.length} Engine${selectedEngines.length > 1 ? "s" : ""}`}
            </span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">AI Search Engines</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                All
              </Button>
              <Button variant="ghost" size="sm" onClick={selectNone}>
                None
              </Button>
            </div>
          </div>
        </div>
        <div className="p-2 max-h-[300px] overflow-y-auto">
          {AI_ENGINES.map((engine, index) => (
            <motion.div
              key={engine.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                selectedEngines.includes(engine.id)
                  ? "bg-primary/10"
                  : "hover:bg-secondary/50",
                !engine.supported && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => engine.supported && toggleEngine(engine.id)}
            >
              <Checkbox
                checked={selectedEngines.includes(engine.id)}
                disabled={!engine.supported}
                onCheckedChange={() => engine.supported && toggleEngine(engine.id)}
              />
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center",
                  engine.color
                )}
              >
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{engine.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {engine.description}
                </p>
              </div>
              {!engine.supported && (
                <Badge variant="outline" className="text-xs">
                  Coming Soon
                </Badge>
              )}
            </motion.div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Compact engine badges display
interface EnginesBadgesProps {
  engines: AIEngine[];
  maxDisplay?: number;
}

export function EnginesBadges({ engines, maxDisplay = 4 }: EnginesBadgesProps) {
  const displayEngines = engines.slice(0, maxDisplay);
  const remaining = engines.length - maxDisplay;

  return (
    <div className="flex items-center gap-1">
      {displayEngines.map((engineId) => {
        const engine = AI_ENGINES.find((e) => e.id === engineId);
        if (!engine) return null;
        return (
          <div
            key={engineId}
            className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center",
              engine.color
            )}
            title={engine.name}
          >
            <Bot className="h-3 w-3 text-white" />
          </div>
        );
      })}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{remaining}
        </Badge>
      )}
    </div>
  );
}

// Engine filter for dashboard views
interface EngineFilterProps {
  selectedEngine: AIEngine | "all";
  onEngineChange: (engine: AIEngine | "all") => void;
}

export function EngineFilter({ selectedEngine, onEngineChange }: EngineFilterProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant={selectedEngine === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => onEngineChange("all")}
      >
        All Engines
      </Button>
      {AI_ENGINES.filter((e) => e.supported).map((engine) => (
        <Button
          key={engine.id}
          variant={selectedEngine === engine.id ? "default" : "outline"}
          size="sm"
          className="gap-2"
          onClick={() => onEngineChange(engine.id)}
        >
          <div className={cn("h-3 w-3 rounded-full", engine.color)} />
          {engine.shortName}
        </Button>
      ))}
    </div>
  );
}
