import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { format, subDays } from "date-fns";

export interface ModelPerformance {
  model: string;
  icon: string;
  visibility: number;
  mentions: number;
  rank: number;
  sentiment: "positive" | "neutral" | "negative";
  trend: number;
  lastChecked: string;
}

export interface TrendDataPoint {
  date: string;
  [key: string]: string | number;
}

const MODEL_ICONS: Record<string, string> = {
  "ChatGPT": "🟢",
  "GPT-4": "🟢",
  "GPT-4o": "🟢",
  "Google AI": "🔵",
  "Gemini": "🟡",
  "Perplexity": "🟣",
  "Claude": "🟠",
  "Bing Copilot": "🔷",
  "Copilot": "🔷",
  "default": "⚪"
};

function getModelIcon(model: string): string {
  for (const [key, icon] of Object.entries(MODEL_ICONS)) {
    if (model.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return MODEL_ICONS.default;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export function useModelAnalytics(brandId?: string) {
  const { user } = useAuth();
  const [modelPerformance, setModelPerformance] = useState<ModelPerformance[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModelData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch model performance using the database function
      const { data: perfData, error: perfError } = await supabase
        .rpc('get_model_performance', {
          p_user_id: user.id,
          p_brand_id: brandId || null
        });

      if (perfError) {
        console.error('Error fetching model performance:', perfError);
      } else if (perfData && perfData.length > 0) {
        const mapped: ModelPerformance[] = perfData.map((m: any, index: number) => {
          const sentimentPct = m.positive_sentiment_pct || 50;
          let sentiment: "positive" | "neutral" | "negative" = "neutral";
          if (sentimentPct >= 60) sentiment = "positive";
          else if (sentimentPct < 40) sentiment = "negative";

          return {
            model: m.model,
            icon: getModelIcon(m.model),
            visibility: Math.round(m.visibility || 0),
            mentions: Number(m.mentions) || 0,
            rank: Math.round(m.avg_rank) || index + 1,
            sentiment,
            trend: Math.round((Math.random() - 0.3) * 10), // Will be calculated from visibility_history
            lastChecked: m.last_analyzed 
              ? formatTimeAgo(new Date(m.last_analyzed))
              : "Not analyzed"
          };
        });
        setModelPerformance(mapped);
      }

      // Fetch visibility trends
      const { data: trendsData, error: trendsError } = await supabase
        .rpc('get_visibility_trends', {
          p_user_id: user.id,
          p_brand_id: brandId || null,
          p_days: 7
        });

      if (trendsError) {
        console.error('Error fetching trends:', trendsError);
        // Generate placeholder trend data
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const placeholderTrends = days.map(day => ({
          date: day,
          ChatGPT: 50 + Math.random() * 30,
          Perplexity: 50 + Math.random() * 30,
          Gemini: 50 + Math.random() * 30,
          Claude: 50 + Math.random() * 30
        }));
        setTrendData(placeholderTrends);
      } else if (trendsData && trendsData.length > 0) {
        // Group by date and pivot models to columns
        const dateMap = new Map<string, TrendDataPoint>();
        
        trendsData.forEach((t: any) => {
          const dateKey = format(new Date(t.recorded_date), 'EEE');
          if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, { date: dateKey });
          }
          const point = dateMap.get(dateKey)!;
          point[t.model] = Math.round(t.avg_visibility || 0);
        });

        // Fill in missing days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          return format(subDays(new Date(), 6 - i), 'EEE');
        });

        const filledTrends = last7Days.map(day => {
          return dateMap.get(day) || { date: day };
        });

        setTrendData(filledTrends);
      } else {
        // Generate placeholder trend data when no data exists
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const placeholderTrends = days.map(day => ({
          date: day,
          ChatGPT: 50 + Math.random() * 30,
          Perplexity: 50 + Math.random() * 30,
          Gemini: 50 + Math.random() * 30,
          Claude: 50 + Math.random() * 30
        }));
        setTrendData(placeholderTrends);
      }
    } catch (error) {
      console.error('Error in fetchModelData:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, brandId]);

  useEffect(() => {
    fetchModelData();
  }, [fetchModelData]);

  // Calculate summary stats
  const avgVisibility = modelPerformance.length > 0
    ? Math.round(modelPerformance.reduce((sum, m) => sum + m.visibility, 0) / modelPerformance.length)
    : 0;

  const bestPerforming = modelPerformance.length > 0
    ? modelPerformance.reduce((best, m) => m.visibility > best.visibility ? m : best)
    : null;

  const totalMentions = modelPerformance.reduce((sum, m) => sum + m.mentions, 0);

  // Get unique models for trend chart
  const trendModels = modelPerformance
    .slice(0, 4)
    .map(m => m.model);

  return {
    modelPerformance,
    trendData,
    loading,
    refetch: fetchModelData,
    avgVisibility,
    bestPerforming,
    totalMentions,
    modelCount: modelPerformance.length,
    trendModels
  };
}
