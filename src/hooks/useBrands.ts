import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "@/hooks/use-toast";

interface Brand {
  id: string;
  name: string;
  is_primary: boolean;
  created_at: string;
}

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrand, setActiveBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setBrands([]);
      setActiveBrand(null);
      setLoading(false);
      return;
    }

    fetchBrands();
  }, [user]);

  const fetchBrands = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching brands:", error);
      setLoading(false);
      return;
    }
    
    // If no brands exist, create a default one
    if (!data || data.length === 0) {
      const { data: newBrand, error: createError } = await supabase
        .from("brands")
        .insert({
          name: "My Brand",
          user_id: user.id,
          is_primary: true,
        })
        .select()
        .single();
      
      if (!createError && newBrand) {
        setBrands([newBrand]);
        setActiveBrand(newBrand);
      }
    } else {
      setBrands(data);
      const primary = data.find((b) => b.is_primary);
      setActiveBrand(primary || data[0] || null);
    }
    setLoading(false);
  };

  const createBrand = async (name: string, isPrimary = false) => {
    if (!user) return null;

    // If this is primary, unset other primaries first
    if (isPrimary) {
      await supabase
        .from("brands")
        .update({ is_primary: false })
        .eq("user_id", user.id);
    }

    const { data, error } = await supabase
      .from("brands")
      .insert({
        name,
        is_primary: isPrimary,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error creating brand",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }

    toast({
      title: "Brand created",
      description: `${name} has been added to your brands`,
    });

    await fetchBrands();
    return data;
  };

  const updateBrand = async (id: string, updates: Partial<Brand>) => {
    if (!user) return false;

    // If setting as primary, unset other primaries first
    if (updates.is_primary) {
      await supabase
        .from("brands")
        .update({ is_primary: false })
        .eq("user_id", user.id);
    }

    const { error } = await supabase
      .from("brands")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast({
        title: "Error updating brand",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    await fetchBrands();
    return true;
  };

  const deleteBrand = async (id: string) => {
    if (!user) return false;

    const { error } = await supabase.from("brands").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting brand",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Brand deleted",
      description: "Brand has been removed",
    });

    await fetchBrands();
    return true;
  };

  const switchBrand = (brand: Brand) => {
    setActiveBrand(brand);
  };

  return {
    brands,
    activeBrand,
    loading,
    createBrand,
    updateBrand,
    deleteBrand,
    switchBrand,
    refetch: fetchBrands,
  };
}
