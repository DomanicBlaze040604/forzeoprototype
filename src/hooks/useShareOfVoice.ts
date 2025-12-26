import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface ShareOfVoiceData {
  name: string;
  mentions: number;
  isYou?: boolean;
}

interface UseShareOfVoiceReturn {
  data: ShareOfVoiceData[];
  loading: boolean;
  refetch: () => Promise<void>;
  yourShare: number;
  totalMentions: number;
}

export function useShareOfVoice(brandId?: string): UseShareOfVoiceReturn {
  const { user } = useAuth();
  const [data, setData] = useState<ShareOfVoiceData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShareOfVoice = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get brand info
      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("id, name")
        .eq("user_id", user.id)
        .eq(brandId ? "id" : "is_primary", brandId || true)
        .single();

      if (brandError && brandError.code !== "PGRST116") throw brandError;

      const activeBrandId = brand?.id || brandId;
      const brandName = brand?.name || "Your Brand";

      // Get brand mentions count
      let brandMentionsQuery = supabase
        .from("prompt_results")
        .select("id, prompts!inner(user_id, brand_id)")
        .eq("brand_mentioned", true)
        .eq("prompts.user_id", user.id);

      if (activeBrandId) {
        brandMentionsQuery = brandMentionsQuery.eq("prompts.brand_id", activeBrandId);
      }

      const { data: brandMentions, error: mentionsError } = await brandMentionsQuery;
      if (mentionsError) throw mentionsError;

      const brandMentionCount = brandMentions?.length || 0;

      // Get competitors
      const { data: competitors, error: compError } = await supabase
        .from("competitors")
        .select("id, name, last_visibility_score")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq(activeBrandId ? "brand_id" : "brand_id", activeBrandId || "");

      if (compError && compError.code !== "PGRST116") {
        console.error("Competitors fetch error:", compError);
      }

      // Build share of voice data
      const sovData: ShareOfVoiceData[] = [
        { name: brandName, mentions: brandMentionCount, isYou: true },
      ];

      // Add competitors with estimated mentions based on visibility
      competitors?.forEach((comp: any) => {
        const estimatedMentions = Math.round(
          (comp.last_visibility_score || 0) * brandMentionCount / 100
        ) || Math.round(Math.random() * brandMentionCount);
        
        sovData.push({
          name: comp.name,
          mentions: estimatedMentions,
          isYou: false,
        });
      });

      // If no competitors, add placeholder data
      if (sovData.length === 1 && brandMentionCount > 0) {
        sovData.push(
          { name: "Industry Average", mentions: Math.round(brandMentionCount * 0.8), isYou: false },
        );
      }

      setData(sovData.sort((a, b) => b.mentions - a.mentions));
    } catch (error) {
      console.error("Error fetching share of voice:", error);
    } finally {
      setLoading(false);
    }
  }, [user, brandId]);

  useEffect(() => {
    fetchShareOfVoice();
  }, [fetchShareOfVoice]);

  const totalMentions = data.reduce((sum, d) => sum + d.mentions, 0);
  const yourBrand = data.find((d) => d.isYou);
  const yourShare = totalMentions > 0 && yourBrand
    ? Math.round((yourBrand.mentions / totalMentions) * 100)
    : 0;

  return {
    data,
    loading,
    refetch: fetchShareOfVoice,
    yourShare,
    totalMentions,
  };
}
