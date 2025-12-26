import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Source {
  id: string;
  domain: string;
  favicon: string;
  type: { label: string; color: string };
  used: number;
  avgCitations: number;
  trustScore: number;
  verified: boolean;
  hallucination_risk: string;
}

const TYPE_COLORS: Record<string, { label: string; color: string }> = {
  "Reference": { label: "Reference", color: "bg-yellow-500/20 text-yellow-400" },
  "UGC": { label: "UGC", color: "bg-orange-500/20 text-orange-400" },
  "Editorial": { label: "Editorial", color: "bg-purple-500/20 text-purple-400" },
  "Review": { label: "Review", color: "bg-blue-500/20 text-blue-400" },
  "Competitor": { label: "Competitor", color: "bg-red-500/20 text-red-400" },
  "You": { label: "You", color: "bg-green-500/20 text-green-400" },
  "default": { label: "Other", color: "bg-gray-500/20 text-gray-400" }
};

const DOMAIN_FAVICONS: Record<string, string> = {
  "reddit.com": "🟠",
  "wikipedia.org": "📖",
  "youtube.com": "🔴",
  "github.com": "⬛",
  "twitter.com": "🐦",
  "x.com": "🐦",
  "linkedin.com": "🔵",
  "medium.com": "📝",
  "techradar.com": "📱",
  "g2.com": "🟢",
  "capterra.com": "🌟",
  "trustpilot.com": "⭐",
  "hubspot.com": "🟧",
  "salesforce.com": "☁️",
  "default": "🌐"
};

function getDomainFavicon(domain: string): string {
  const lowerDomain = domain.toLowerCase();
  for (const [key, icon] of Object.entries(DOMAIN_FAVICONS)) {
    if (lowerDomain.includes(key)) {
      return icon;
    }
  }
  return DOMAIN_FAVICONS.default;
}

function getSourceType(sourceType: string | null, domain: string): { label: string; color: string } {
  if (sourceType && TYPE_COLORS[sourceType]) {
    return TYPE_COLORS[sourceType];
  }
  // Try to infer from domain
  if (domain.includes("reddit") || domain.includes("youtube")) {
    return TYPE_COLORS["UGC"];
  }
  if (domain.includes("wikipedia")) {
    return TYPE_COLORS["Reference"];
  }
  if (domain.includes("g2") || domain.includes("capterra") || domain.includes("trustpilot")) {
    return TYPE_COLORS["Review"];
  }
  return TYPE_COLORS["default"];
}

export interface PieDataPoint {
  name: string;
  value: number;
  color: string;
}

export function useSources() {
  const { user } = useAuth();
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSources = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .eq('user_id', user.id)
        .order('usage_percentage', { ascending: false });

      if (error) {
        console.error('Error fetching sources:', error);
      } else if (data) {
        const mapped: Source[] = data.map(s => ({
          id: s.id,
          domain: s.domain,
          favicon: getDomainFavicon(s.domain),
          type: getSourceType(s.source_type, s.domain),
          used: Math.round(s.usage_percentage || 0),
          avgCitations: Number(s.avg_citations) || 0,
          trustScore: Math.round(s.trust_score || 50),
          verified: s.verified || false,
          hallucination_risk: s.hallucination_risk || 'unknown'
        }));
        setSources(mapped);
      }
    } catch (error) {
      console.error('Error in fetchSources:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Calculate chart data
  const chartData = sources.map(s => ({
    name: s.domain.split(".")[0],
    citations: s.avgCitations,
    usage: s.used
  }));

  // Calculate pie chart data (source type distribution)
  const typeDistribution = sources.reduce((acc, s) => {
    const type = s.type.label;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieColors: Record<string, string> = {
    "Reference": "hsl(48, 96%, 53%)",
    "UGC": "hsl(25, 95%, 53%)",
    "Editorial": "hsl(280, 65%, 60%)",
    "Review": "hsl(199, 89%, 48%)",
    "Competitor": "hsl(0, 72%, 51%)",
    "You": "hsl(142, 76%, 36%)",
    "Other": "hsl(220, 10%, 50%)"
  };

  const pieData: PieDataPoint[] = Object.entries(typeDistribution).map(([name, value]) => ({
    name,
    value,
    color: pieColors[name] || pieColors["Other"]
  }));

  // Calculate summary stats
  const totalSources = sources.length;
  const verifiedCount = sources.filter(s => s.verified).length;
  const yourSources = sources.filter(s => s.type.label === "You").length;
  const competitorSources = sources.filter(s => s.type.label === "Competitor").length;

  return {
    sources,
    loading,
    refetch: fetchSources,
    chartData,
    pieData,
    totalSources,
    verifiedCount,
    yourSources,
    competitorSources
  };
}
