// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { industry, brandName, competitors, existingPrompts } = await req.json();

    // Fetch user's existing prompts if not provided
    let promptContext = existingPrompts || [];
    if (promptContext.length === 0) {
      const { data: userPrompts } = await supabaseClient
        .from("prompts")
        .select("text, tag")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      promptContext = userPrompts?.map((p) => p.text) || [];
    }

    // Fetch competitors if not provided
    let competitorList = competitors || [];
    if (competitorList.length === 0) {
      const { data: userCompetitors } = await supabaseClient
        .from("competitors")
        .select("name")
        .eq("user_id", user.id)
        .eq("is_active", true);
      
      competitorList = userCompetitors?.map((c) => c.name) || [];
    }

    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert at AI visibility and SEO strategy. Your task is to suggest prompts that users can track to monitor their brand's visibility in AI-generated responses.

Generate prompts that:
1. Are realistic queries that potential customers would ask AI assistants
2. Cover different stages of the buyer journey (awareness, consideration, decision)
3. Include comparison and recommendation-style queries
4. Target industry-specific topics and pain points
5. Are likely to surface brand recommendations in AI responses

Return ONLY a JSON array of prompt objects with this structure:
[
  {
    "text": "the prompt text",
    "tag": "category tag (e.g., Comparison, Feature, Industry, Use Case)",
    "rationale": "brief explanation of why this prompt is valuable to track"
  }
]

Generate 5-8 unique, high-value prompts.`;

    const userMessage = `Generate prompt suggestions for:
- Brand: ${brandName || "Not specified"}
- Industry: ${industry || "Technology/SaaS"}
- Competitors: ${competitorList.length > 0 ? competitorList.join(", ") : "Not specified"}
- Existing prompts to avoid duplicating: ${promptContext.slice(0, 5).join("; ") || "None yet"}

Focus on prompts that would help track AI visibility and competitive positioning.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Groq API error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "[]";

    // Parse the JSON from the AI response
    let suggestions = [];
    try {
      // Extract JSON array from the response (in case there's extra text)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      // Fallback suggestions if parsing fails
      suggestions = [
        { text: `What is the best ${industry || "software"} solution for small businesses?`, tag: "Comparison", rationale: "Targets recommendation queries" },
        { text: `${brandName || "Your brand"} vs competitors: which is better?`, tag: "Comparison", rationale: "Direct comparison query" },
        { text: `Top ${industry || "technology"} tools in 2024`, tag: "Industry", rationale: "Industry roundup queries" },
      ];
    }

    console.log(`Generated ${suggestions.length} prompt suggestions for user ${user.id}`);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in suggest-prompts function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
