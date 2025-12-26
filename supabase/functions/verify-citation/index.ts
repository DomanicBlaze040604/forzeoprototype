// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationRequest {
  sourceUrl: string;
  claimText: string;
  claimEmbedding?: number[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { sourceUrl, claimText, claimEmbedding } = await req.json() as VerificationRequest;

    if (!sourceUrl || !claimText) {
      return new Response(
        JSON.stringify({ error: "sourceUrl and claimText are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the source URL content
    let sourceContent = "";
    let fetchError = null;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(sourceUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FORZEO/1.0; Citation Verification Bot)",
        },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const html = await response.text();
        // Extract text content from HTML (basic extraction)
        sourceContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 10000); // Limit content size
      } else {
        fetchError = `HTTP ${response.status}`;
      }
    } catch (e) {
      fetchError = e instanceof Error ? e.message : "Failed to fetch URL";
    }

    // Determine verification status based on fetch result
    let verificationStatus = "pending";
    let hallucinationRisk = "unknown";
    
    if (fetchError) {
      if (fetchError.includes("404") || fetchError.includes("Not Found")) {
        verificationStatus = "not_found";
        hallucinationRisk = "high";
      } else {
        verificationStatus = "fetch_error";
        hallucinationRisk = "medium";
      }
    } else if (sourceContent.length < 100) {
      verificationStatus = "insufficient_content";
      hallucinationRisk = "medium";
    } else {
      verificationStatus = "content_fetched";
      hallucinationRisk = "pending_analysis";
    }

    // Store the verification record
    const { data: verification, error: insertError } = await supabaseClient
      .from("citation_verifications")
      .insert({
        user_id: user.id,
        source_url: sourceUrl,
        claim_text: claimText,
        source_content: sourceContent || null,
        claim_embedding: claimEmbedding || null,
        verification_status: verificationStatus,
        hallucination_risk: hallucinationRisk,
        verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store verification", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        verification: {
          id: verification.id,
          sourceUrl,
          verificationStatus,
          hallucinationRisk,
          contentLength: sourceContent.length,
          fetchError,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
