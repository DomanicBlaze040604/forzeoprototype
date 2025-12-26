import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface URLCitation {
  id: string;
  url: string;
  domain: string;
  citation_count: number;
  engines: string[];
  prompts: string[];
  first_seen_at: string;
  last_seen_at: string;
  verification_status: "pending" | "verified" | "unverified" | "hallucinated";
  trust_score: number;
}

interface HeatmapData {
  domain: string;
  citations: number;
  urls: URLCitation[];
  avgTrustScore: number;
  engines: string[];
  verificationBreakdown: {
    verified: number;
    unverified: number;
    hallucinated: number;
    pending: number;
  };
}

interface CitationTrend {
  date: string;
  count: number;
  newUrls: number;
}

export function useURLCitations() {
  const [citations, setCitations] = useState<URLCitation[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [trends, setTrends] = useState<CitationTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchCitations = useCallback(async (options?: {
    domain?: string;
    minCount?: number;
    verificationStatus?: string;
    limit?: number;
  }) => {
    if (!user) return;
    setLoading(true);
    
    try {
      let query = supabase
        .from("url_citations")
        .select("*")
        .eq("user_id", user.id)
        .order("citation_count", { ascending: false });
      
      if (options?.domain) {
        query = query.eq("domain", options.domain);
      }
      if (options?.minCount) {
        query = query.gte("citation_count", options.minCount);
      }
      if (options?.verificationStatus) {
        query = query.eq("verification_status", options.verificationStatus);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      setCitations((data as URLCitation[]) || []);
      processHeatmapData((data as URLCitation[]) || []);
    } catch (err) {
      console.error("Failed to fetch citations:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const processHeatmapData = useCallback((data: URLCitation[]) => {
    const domainMap = new Map<string, URLCitation[]>();
    
    for (const citation of data) {
      const existing = domainMap.get(citation.domain) || [];
      existing.push(citation);
      domainMap.set(citation.domain, existing);
    }
    
    const heatmap: HeatmapData[] = [];
    
    for (const [domain, urls] of domainMap) {
      const totalCitations = urls.reduce((sum, u) => sum + u.citation_count, 0);
      const avgTrust = urls.reduce((sum, u) => sum + u.trust_score, 0) / urls.length;
      const allEngines = [...new Set(urls.flatMap(u => u.engines))];
      
      const breakdown = {
        verified: urls.filter(u => u.verification_status === "verified").length,
        unverified: urls.filter(u => u.verification_status === "unverified").length,
        hallucinated: urls.filter(u => u.verification_status === "hallucinated").length,
        pending: urls.filter(u => u.verification_status === "pending").length,
      };
      
      heatmap.push({
        domain,
        citations: totalCitations,
        urls,
        avgTrustScore: avgTrust,
        engines: allEngines,
        verificationBreakdown: breakdown,
      });
    }
    
    // Sort by citation count
    heatmap.sort((a, b) => b.citations - a.citations);
    setHeatmapData(heatmap);
  }, []);

  const updateVerificationStatus = useCallback(async (
    citationId: string,
    status: URLCitation["verification_status"],
    trustScore?: number
  ) => {
    try {
      const updates: any = { verification_status: status };
      if (trustScore !== undefined) {
        updates.trust_score = trustScore;
      }
      
      const { error } = await supabase
        .from("url_citations")
        .update(updates)
        .eq("id", citationId);
      
      if (error) throw error;
      
      setCitations(prev => prev.map(c => 
        c.id === citationId ? { ...c, ...updates } : c
      ));
    } catch (err) {
      console.error("Failed to update verification status:", err);
    }
  }, []);

  const getTopDomains = useCallback((limit: number = 10): HeatmapData[] => {
    return heatmapData.slice(0, limit);
  }, [heatmapData]);

  const getDomainsByEngine = useCallback((engine: string): HeatmapData[] => {
    return heatmapData.filter(d => d.engines.includes(engine));
  }, [heatmapData]);

  const getVerificationStats = useCallback(() => {
    return {
      total: citations.length,
      verified: citations.filter(c => c.verification_status === "verified").length,
      unverified: citations.filter(c => c.verification_status === "unverified").length,
      hallucinated: citations.filter(c => c.verification_status === "hallucinated").length,
      pending: citations.filter(c => c.verification_status === "pending").length,
      avgTrustScore: citations.length > 0 
        ? citations.reduce((sum, c) => sum + c.trust_score, 0) / citations.length 
        : 0,
    };
  }, [citations]);

  useEffect(() => {
    fetchCitations();
  }, [fetchCitations]);

  return {
    citations,
    heatmapData,
    trends,
    loading,
    fetchCitations,
    updateVerificationStatus,
    getTopDomains,
    getDomainsByEngine,
    getVerificationStats,
  };
}
