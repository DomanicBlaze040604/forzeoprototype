import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface CitationSource {
  domain: string;
  citations: number;
  verified: boolean;
  trustScore: number;
  hallucinationRisk: "low" | "medium" | "high";
}

interface UseCitationSourcesReturn {
  sources: CitationSource[];
  loading: boolean;
  refetch: () => Promise<void>;
  totalSources: number;
  verifiedCount: number;
  avgTrustScore: number;
  highRiskCount: number;
}

export function useCitationSources(): UseCitationSourcesReturn {
  const { user } = useAuth();
  const [sources, setSources] = useState<CitationSource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSources = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch from sources table
      const { data: sourcesData, error: sourcesError } = await supabase
        .from("sources")
        .select("*")
        .eq("user_id", user.id)
        .order("avg_citations", { ascending: false });

      if (sourcesError) throw sourcesError;

      // Also aggregate from citation_verifications
      const { data: verifications, error: verifError } = await supabase
        .from("citation_verifications")
        .select("source_url, verification_status, hallucination_risk, similarity_score")
        .eq("user_id", user.id);

      if (verifError) throw verifError;

      // Aggregate by domain
      const domainMap = new Map<string, {
        citations: number;
        verified: boolean;
        scores: number[];
        risks: string[];
      }>();

      // Process sources table data
      sourcesData?.forEach((source: any) => {
        const domain = source.domain;
        domainMap.set(domain, {
          citations: source.avg_citations || 1,
          verified: source.verified || false,
          scores: [source.trust_score || 50],
          risks: [source.hallucination_risk || "unknown"],
        });
      });

      // Process verifications
      verifications?.forEach((v: any) => {
        try {
          const url = new URL(v.source_url);
          const domain = url.hostname.replace("www.", "");
          const existing = domainMap.get(domain) || {
            citations: 0,
            verified: false,
            scores: [],
            risks: [],
          };

          existing.citations += 1;
          if (v.verification_status === "verified") existing.verified = true;
          if (v.similarity_score) existing.scores.push(v.similarity_score * 100);
          if (v.hallucination_risk) existing.risks.push(v.hallucination_risk);

          domainMap.set(domain, existing);
        } catch {
          // Invalid URL, skip
        }
      });

      // Convert to array
      const sourcesArray: CitationSource[] = Array.from(domainMap.entries())
        .map(([domain, data]) => {
          const avgScore = data.scores.length > 0
            ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
            : 50;

          // Determine risk level
          let hallucinationRisk: "low" | "medium" | "high" = "medium";
          const highRiskCount = data.risks.filter((r) => r === "high" || r === "very_high").length;
          const lowRiskCount = data.risks.filter((r) => r === "low").length;

          if (highRiskCount > lowRiskCount) hallucinationRisk = "high";
          else if (lowRiskCount > highRiskCount) hallucinationRisk = "low";

          return {
            domain,
            citations: data.citations,
            verified: data.verified,
            trustScore: avgScore,
            hallucinationRisk,
          };
        })
        .sort((a, b) => b.citations - a.citations);

      setSources(sourcesArray);
    } catch (error) {
      console.error("Error fetching citation sources:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const verifiedCount = sources.filter((s) => s.verified).length;
  const highRiskCount = sources.filter((s) => s.hallucinationRisk === "high").length;
  const avgTrustScore = sources.length > 0
    ? Math.round(sources.reduce((sum, s) => sum + s.trustScore, 0) / sources.length)
    : 0;

  return {
    sources,
    loading,
    refetch: fetchSources,
    totalSources: sources.length,
    verifiedCount,
    avgTrustScore,
    highRiskCount,
  };
}
