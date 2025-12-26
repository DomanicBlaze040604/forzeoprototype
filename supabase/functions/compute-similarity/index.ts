// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SimilarityRequest {
  verificationId: string;
  claimEmbedding: number[];
  sourceEmbedding: number[];
}

// Compute cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// Determine hallucination risk based on similarity score
function getHallucinationRisk(similarity: number): string {
  if (similarity >= 0.7) return "low";
  if (similarity >= 0.5) return "medium";
  if (similarity >= 0.3) return "high";
  return "very_high";
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

    const { verificationId, claimEmbedding, sourceEmbedding } = await req.json() as SimilarityRequest;

    if (!verificationId || !claimEmbedding || !sourceEmbedding) {
      return new Response(
        JSON.stringify({ error: "verificationId, claimEmbedding, and sourceEmbedding are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compute similarity
    const similarityScore = cosineSimilarity(claimEmbedding, sourceEmbedding);
    const hallucinationRisk = getHallucinationRisk(similarityScore);
    const verificationStatus = similarityScore >= 0.5 ? "verified" : "unverified";

    // Update the verification record with embeddings and scores
    const { error: updateError } = await supabaseClient
      .from("citation_verifications")
      .update({
        claim_embedding: JSON.stringify(claimEmbedding),
        source_embedding: JSON.stringify(sourceEmbedding),
        similarity_score: similarityScore,
        hallucination_risk: hallucinationRisk,
        verification_status: verificationStatus,
        verified_at: new Date().toISOString(),
      })
      .eq("id", verificationId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update verification", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        verificationId,
        similarityScore: Math.round(similarityScore * 100) / 100,
        hallucinationRisk,
        verificationStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Similarity computation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
