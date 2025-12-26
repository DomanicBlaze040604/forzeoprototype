import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

interface Competitor {
  id: string;
  name: string;
  brand_id: string | null;
  is_active: boolean;
  last_visibility_score: number;
  last_rank: number | null;
  created_at: string;
}

export function useCompetitors(brandId?: string) {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setCompetitors([]);
      setLoading(false);
      return;
    }

    fetchCompetitors();
  }, [user, brandId]);

  const fetchCompetitors = async () => {
    if (!user) return;

    let query = supabase
      .from("competitors")
      .select("*")
      .order("created_at", { ascending: false });

    if (brandId) {
      query = query.eq("brand_id", brandId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching competitors:", error);
    } else {
      setCompetitors(data || []);
    }
    setLoading(false);
  };

  const addCompetitor = async (name: string, brandId?: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("competitors")
      .insert({
        name,
        brand_id: brandId || null,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error adding competitor",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    toast({
      title: "Competitor added",
      description: `Now tracking ${name}`,
    });

    await fetchCompetitors();
    return data;
  };

  const updateCompetitor = async (id: string, updates: Partial<Competitor>) => {
    const { error } = await supabase
      .from("competitors")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({
        title: "Error updating competitor",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    await fetchCompetitors();
    return true;
  };

  const deleteCompetitor = async (id: string) => {
    const { error } = await supabase.from("competitors").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error removing competitor",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Competitor removed",
      description: "No longer tracking this competitor",
    });

    await fetchCompetitors();
    return true;
  };

  const toggleActive = async (id: string) => {
    const competitor = competitors.find((c) => c.id === id);
    if (!competitor) return false;

    return updateCompetitor(id, { is_active: !competitor.is_active });
  };

  return {
    competitors,
    loading,
    addCompetitor,
    updateCompetitor,
    deleteCompetitor,
    toggleActive,
    refetch: fetchCompetitors,
  };
}
