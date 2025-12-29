/**
 * Forzeo Content Generation API - Supabase Edge Function
 * 
 * Generates GEO-optimized content using Groq's Llama 3.1 model.
 * Used for:
 * - Generating search prompts from keywords
 * - Creating AI-optimized articles, listicles, guides
 * - Content that AI models are likely to reference and cite
 * 
 * REQUIRED ENVIRONMENT VARIABLES:
 * - GROQ_API_KEY: Your Groq API key (free at console.groq.com)
 * 
 * @example
 * POST /functions/v1/generate-content
 * {
 *   "prompt": "Write an article about best dating apps in India",
 *   "systemPrompt": "You are an expert content writer...",
 *   "type": "article"
 * }
 */

// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// ============================================
// CONFIGURATION
// ============================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// TYPE DEFINITIONS
// ============================================

interface GenerateContentRequest {
  prompt: string;
  systemPrompt?: string;
  type?: "content_brief" | "full_content" | "article" | "listicle" | "comparison" | "guide" | "faq";
}

// ============================================
// GROQ API
// ============================================

/**
 * Call Groq API with Llama 3.1 8B model
 * Free tier: 14,400 requests/day
 */
async function callGroq(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  console.log("[Groq] Generating content...");

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
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  
  console.log(`[Groq] Generated ${content.length} characters`);
  
  return content;
}

// ============================================
// SYSTEM PROMPTS
// ============================================

/**
 * Get appropriate system prompt based on content type
 */
function getSystemPrompt(type: string): string {
  switch (type) {
    case "content_brief":
      return "You are a content strategist. Generate structured content briefs. Always respond with valid JSON.";
    
    case "article":
      return `You are an expert content writer specializing in GEO (Generative Engine Optimization).
Create high-quality, SEO-optimized articles in Markdown format.
- Use clear headings (H2, H3)
- Include numbered lists where appropriate
- Write in an authoritative but accessible tone
- Target 600-1000 words
- Make content suitable for AI models to reference and cite`;
    
    case "listicle":
      return `You are an expert content writer.
Create engaging listicle content in Markdown format.
- Use numbered lists as the main structure
- Include brief explanations for each item
- Mention specific brands/products by name
- Be balanced and informative
- Target 500-800 words`;
    
    case "comparison":
      return `You are an expert content writer.
Create balanced comparison content in Markdown format.
- Compare features, pros, and cons objectively
- Use tables where appropriate
- Include specific details and data points
- Help readers make informed decisions
- Target 600-900 words`;
    
    case "guide":
      return `You are an expert content writer.
Create comprehensive how-to guides in Markdown format.
- Use step-by-step instructions
- Include tips and best practices
- Address common questions and issues
- Be thorough but concise
- Target 700-1000 words`;
    
    case "faq":
      return `You are an expert content writer.
Create FAQ content in Markdown format.
- Use Q&A format with clear questions
- Provide concise but complete answers
- Cover common questions and concerns
- Include relevant details and examples
- Target 500-800 words`;
    
    default:
      return "You are an expert content writer. Create high-quality, SEO-optimized content in Markdown format.";
  }
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const { prompt, systemPrompt, type = "full_content" } = await req.json() as GenerateContentRequest;

    // Validate
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Content] Generating ${type} content...`);

    // Get system prompt (use provided or default based on type)
    const finalSystemPrompt = systemPrompt || getSystemPrompt(type);

    // Generate content
    const response = await callGroq(prompt, finalSystemPrompt);

    console.log(`[Content] Generated ${response.length} characters`);

    // Return response
    return new Response(
      JSON.stringify({ 
        response,
        type,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("[Content] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
