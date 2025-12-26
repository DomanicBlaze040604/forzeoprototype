import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface CitationVerification {
  id: string;
  source_url: string;
  claim_text: string;
  verification_status: string | null;
  hallucination_risk: string | null;
  similarity_score: number | null;
  created_at: string;
  verified_at: string | null;
}

interface CitationStats {
  total: number;
  verified: number;
  lowRisk: number;
  mediumRisk: number;
  highRisk: number;
  avgSimilarity: number;
}

interface UseCitationHistoryReturn {
  citations: CitationVerification[];
  stats: CitationStats;
  loading: boolean;
  refresh: () => Promise<void>;
  deleteCitation: (id: string) => Promise<void>;
}

export function useCitationHistory(): UseCitationHistoryReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [citations, setCitations] = useState<CitationVerification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCitations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("citation_verifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        // Check if it's a "table doesn't exist" error
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          console.warn("citation_verifications table not found - feature not available");
          setCitations([]);
        } else {
          console.error("Error fetching citations:", error);
          toast({
            title: "Error",
            description: "Failed to load citation history",
            variant: "destructive",
          });
        }
      } else {
        setCitations(data || []);
      }
    } catch (err) {
      console.error("Error fetching citations:", err);
      setCitations([]);
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchCitations();
  }, [fetchCitations]);

  const deleteCitation = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("citation_verifications")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete citation",
        variant: "destructive",
      });
    } else {
      setCitations((prev) => prev.filter((c) => c.id !== id));
      toast({
        title: "Deleted",
        description: "Citation removed from history",
      });
    }
  }, [toast]);

  const stats: CitationStats = {
    total: citations.length,
    verified: citations.filter((c) => c.verification_status === "verified").length,
    lowRisk: citations.filter((c) => c.hallucination_risk === "low").length,
    mediumRisk: citations.filter((c) => c.hallucination_risk === "medium").length,
    highRisk: citations.filter(
      (c) => c.hallucination_risk === "high" || c.hallucination_risk === "very_high"
    ).length,
    avgSimilarity:
      citations.length > 0
        ? citations.reduce((sum, c) => sum + (c.similarity_score || 0), 0) /
          citations.filter((c) => c.similarity_score !== null).length || 0
        : 0,
  };

  return {
    citations,
    stats,
    loading,
    refresh: fetchCitations,
    deleteCitation,
  };
}
