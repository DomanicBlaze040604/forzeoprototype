import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Loader2, Lightbulb, X, Check } from "lucide-react";
import { usePromptSuggestions } from "@/hooks/usePromptSuggestions";
import { cn } from "@/lib/utils";

interface PromptSuggestionsProps {
  onAddPrompt?: (text: string, tag: string) => void;
  brandName?: string;
  competitors?: string[];
}

export function PromptSuggestions({
  onAddPrompt,
  brandName,
  competitors,
}: PromptSuggestionsProps) {
  const { suggestions, loading, generateSuggestions, clearSuggestions } = usePromptSuggestions();
  const [industry, setIndustry] = useState("");
  const [addedPrompts, setAddedPrompts] = useState<Set<string>>(new Set());

  const handleGenerate = () => {
    generateSuggestions({
      industry: industry || undefined,
      brandName,
      competitors,
    });
  };

  const handleAddPrompt = (text: string, tag: string) => {
    if (onAddPrompt) {
      onAddPrompt(text, tag);
      setAddedPrompts((prev) => new Set([...prev, text]));
    }
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Prompt Suggestions
        </CardTitle>
        <CardDescription>
          Get AI-powered prompt suggestions based on your industry and competitors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input Section */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1 space-y-2">
            <Label htmlFor="industry" className="text-sm text-muted-foreground">
              Industry (optional)
            </Label>
            <Input
              id="industry"
              placeholder="e.g., CRM, Marketing, E-commerce..."
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Suggestions
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Suggestions List */}
        <AnimatePresence mode="wait">
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {suggestions.length} suggestions generated
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSuggestions}
                  className="gap-1 text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              </div>

              <div className="space-y-2">
                {suggestions.map((suggestion, index) => {
                  const isAdded = addedPrompts.has(suggestion.text);
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "rounded-lg border border-border p-4 transition-all",
                        isAdded ? "bg-primary/5 border-primary/30" : "bg-secondary/30 hover:bg-secondary/50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-primary" />
                            <Badge variant="outline" className="text-xs">
                              {suggestion.tag}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {suggestion.text}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.rationale}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={isAdded ? "secondary" : "default"}
                          onClick={() => handleAddPrompt(suggestion.text, suggestion.tag)}
                          disabled={isAdded}
                          className="shrink-0 gap-1"
                        >
                          {isAdded ? (
                            <>
                              <Check className="h-3 w-3" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {!loading && suggestions.length === 0 && (
          <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-6 text-center">
            <Sparkles className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              Click "Generate Suggestions" to get AI-powered prompt ideas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
