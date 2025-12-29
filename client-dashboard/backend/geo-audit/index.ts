/**
 * Forzeo GEO Audit API - Supabase Edge Function
 * 
 * This is the main API endpoint for AI visibility analysis.
 * It queries multiple AI models and analyzes responses for brand visibility.
 * 
 * ENDPOINTS USED:
 * - DataForSEO SERP: Google organic search results
 * - DataForSEO AI Overview: Google's AI-generated answers
 * - Groq Llama 3.1: Open-source LLM responses
 * 
 * REQUIRED ENVIRONMENT VARIABLES:
 * - DATAFORSEO_LOGIN: Your DataForSEO email
 * - DATAFORSEO_PASSWORD: Your DataForSEO password
 * - GROQ_API_KEY: Your Groq API key (free at console.groq.com)
 * 
 * @example
 * POST /functions/v1/geo-audit
 * {
 *   "prompt_text": "Best dating apps in India 2025",
 *   "brand_name": "Juleo",
 *   "brand_tags": ["Juleo Club"],
 *   "competitors": ["Bumble", "Tinder"],
 *   "location_code": 2356,
 *   "models": ["google_serp", "google_ai_overview", "groq_llama"]
 * }
 */

// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// CONFIGURATION
// ============================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// DataForSEO API configuration
const DATAFORSEO_API = "https://api.dataforseo.com/v3";
const DATAFORSEO_LOGIN = Deno.env.get("DATAFORSEO_LOGIN") || "";
const DATAFORSEO_PASSWORD = Deno.env.get("DATAFORSEO_PASSWORD") || "";
const DATAFORSEO_AUTH = btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`);

// Groq API configuration
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

// Supabase configuration (optional - for saving to database)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ============================================
// MODEL CONFIGURATIONS
// ============================================

/**
 * Available AI models and their display properties
 */
const MODEL_CONFIGS = {
  google_serp: { name: "Google SERP", color: "#4285f4", provider: "DataForSEO" },
  google_ai_overview: { name: "Google AI Overview", color: "#ea4335", provider: "DataForSEO" },
  groq_llama: { name: "Groq Llama", color: "#f97316", provider: "Groq" },
};

// ============================================
// TYPE DEFINITIONS
// ============================================

interface Citation {
  url: string;
  title: string;
  domain: string;
  position?: number;
  snippet?: string;
}

interface ModelResult {
  model: string;
  model_name: string;
  provider: string;
  color: string;
  success: boolean;
  error?: string;
  raw_response: string;
  response_length: number;
  brand_mentioned: boolean;
  brand_mention_count: number;
  brand_rank: number | null;
  brand_sentiment: string;
  matched_terms: string[];
  winner_brand: string;
  competitors_found: Array<{ name: string; count: number; rank: number | null; sentiment: string }>;
  citations: Citation[];
  citation_count: number;
  api_cost: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

/**
 * Analyze sentiment of text around a brand mention
 */
function analyzeSentiment(context: string): "positive" | "neutral" | "negative" {
  const lower = context.toLowerCase();
  
  const positiveWords = ["best", "top", "excellent", "recommended", "leading", 
                         "trusted", "popular", "great", "amazing", "reliable", "safe"];
  const negativeWords = ["avoid", "poor", "worst", "bad", "unreliable", 
                         "scam", "fake", "terrible", "issues", "problems"];
  
  const pos = positiveWords.filter(w => lower.includes(w)).length;
  const neg = negativeWords.filter(w => lower.includes(w)).length;
  
  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}

/**
 * Parse brand mentions and rank from response text
 */
function parseBrandData(response: string, brandName: string, brandTags: string[] = []) {
  const lower = response.toLowerCase();
  const allTerms = [brandName, ...brandTags];
  let totalCount = 0;
  const matchedTerms: string[] = [];
  
  // Count all mentions of brand and alternative names
  for (const term of allTerms) {
    const termLower = term.toLowerCase();
    let idx = 0, count = 0;
    while ((idx = lower.indexOf(termLower, idx)) !== -1) {
      count++;
      idx++;
    }
    if (count > 0) {
      totalCount += count;
      matchedTerms.push(term);
    }
  }
  
  // Find rank in numbered lists (e.g., "1. Juleo", "2) Bumble")
  let rank: number | null = null;
  for (const line of response.split('\n')) {
    const match = line.match(/^\s*(\d+)[.)\]]\s*\*{0,2}(.+)/);
    if (match) {
      for (const term of allTerms) {
        if (match[2].toLowerCase().includes(term.toLowerCase())) {
          rank = parseInt(match[1]);
          break;
        }
      }
      if (rank) break;
    }
  }
  
  // Analyze sentiment around first mention
  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  for (const term of allTerms) {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx !== -1) {
      const context = response.substring(Math.max(0, idx - 100), Math.min(response.length, idx + 100));
      sentiment = analyzeSentiment(context);
      break;
    }
  }
  
  return { mentioned: totalCount > 0, count: totalCount, rank, sentiment, matchedTerms };
}

/**
 * Parse competitor mentions from response
 */
function parseCompetitors(response: string, competitors: string[]) {
  const lower = response.toLowerCase();
  
  return competitors.map(comp => {
    const compLower = comp.toLowerCase();
    let count = 0, idx = 0;
    while ((idx = lower.indexOf(compLower, idx)) !== -1) {
      count++;
      idx++;
    }
    
    if (count === 0) return null;
    
    // Find rank in numbered lists
    let rank: number | null = null;
    for (const line of response.split('\n')) {
      const match = line.match(/^\s*(\d+)[.)\]]\s*\*{0,2}(.+)/);
      if (match && match[2].toLowerCase().includes(compLower)) {
        rank = parseInt(match[1]);
        break;
      }
    }
    
    // Analyze sentiment
    const firstIdx = lower.indexOf(compLower);
    const context = response.substring(Math.max(0, firstIdx - 50), Math.min(response.length, firstIdx + 50));
    
    return { name: comp, count, rank, sentiment: analyzeSentiment(context) };
  }).filter(Boolean).sort((a: any, b: any) => b.count - a.count);
}

/**
 * Find the "winner" brand (highest ranked or most mentioned)
 */
function findWinnerBrand(response: string, brandName: string, competitors: string[]): string {
  let winner = "", maxCount = 0, topRank = 999;
  
  for (const brand of [brandName, ...competitors]) {
    const data = parseBrandData(response, brand);
    if (data.rank === 1) return brand;
    if (data.count > maxCount || (data.count === maxCount && (data.rank || 999) < topRank)) {
      maxCount = data.count;
      topRank = data.rank || 999;
      winner = brand;
    }
  }
  
  return winner;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Make a request to DataForSEO API
 */
async function callDataForSEO(endpoint: string, body: any): Promise<any> {
  console.log(`[DataForSEO] POST ${endpoint}`);
  
  try {
    const response = await fetch(`${DATAFORSEO_API}${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${DATAFORSEO_AUTH}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    const text = await response.text();
    
    if (!response.ok) {
      console.error(`[DataForSEO] HTTP ${response.status}: ${text.substring(0, 200)}`);
      return { error: `HTTP ${response.status}`, status_code: response.status };
    }
    
    const data = JSON.parse(text);
    
    if (data.status_code !== 20000) {
      console.error(`[DataForSEO] API Error: ${data.status_message}`);
      return { error: data.status_message, status_code: data.status_code };
    }
    
    return data;
  } catch (err) {
    console.error(`[DataForSEO] Exception: ${err}`);
    return { error: String(err) };
  }
}

/**
 * Get Google SERP results from DataForSEO
 * Returns organic search results, featured snippets, and People Also Ask
 */
async function getGoogleSERP(prompt: string, locationCode: number): Promise<{
  success: boolean;
  response: string;
  citations: Citation[];
  featuredSnippet: string;
  peopleAlsoAsk: string[];
  cost: number;
  error?: string;
}> {
  console.log("[Google SERP] Querying...");
  
  const data = await callDataForSEO("/serp/google/organic/live/advanced", [{
    keyword: prompt,
    location_code: locationCode,
    language_code: "en",
    device: "desktop",
    depth: 30,  // Get top 30 results
  }]);
  
  if (data.error) {
    return { success: false, response: "", citations: [], featuredSnippet: "", peopleAlsoAsk: [], cost: 0, error: data.error };
  }
  
  const task = data?.tasks?.[0];
  const result = task?.result?.[0];
  const cost = task?.cost || 0;
  const items = result?.items || [];
  
  const parts: string[] = [];
  const citations: Citation[] = [];
  let featuredSnippet = "";
  const peopleAlsoAsk: string[] = [];
  
  // Process each result item
  for (const item of items) {
    if (item.type === "featured_snippet") {
      // Featured snippet - Google's direct answer
      featuredSnippet = item.description || item.title || "";
      parts.push(`=== Featured Answer ===\n${featuredSnippet}`);
      if (item.url) {
        citations.push({
          url: item.url,
          title: item.title || "",
          domain: item.domain || extractDomain(item.url),
          position: 0,
          snippet: item.description,
        });
      }
    } else if (item.type === "organic") {
      // Regular organic result
      citations.push({
        url: item.url,
        title: item.title,
        domain: item.domain,
        position: item.rank_absolute,
        snippet: item.description,
      });
    } else if (item.type === "people_also_ask" && item.items) {
      // People Also Ask questions
      for (const paa of item.items) {
        peopleAlsoAsk.push(paa.title || "");
        if (paa.expanded_element?.description) {
          parts.push(`Q: ${paa.title}\nA: ${paa.expanded_element.description}`);
        }
      }
    }
  }
  
  // Build response text from top results
  parts.push("\n=== Top Search Results ===");
  citations.slice(0, 10).forEach((c, i) => {
    parts.push(`${i + 1}. ${c.title}\n   ${c.snippet || ""}`);
  });
  
  const response = parts.join("\n\n").trim();
  
  console.log(`[Google SERP] Got ${response.length} chars, ${citations.length} citations, cost: ${cost}`);
  
  return { success: response.length > 0, response, citations, featuredSnippet, peopleAlsoAsk, cost };
}

/**
 * Get Google AI Overview from DataForSEO
 * Returns Google's AI-generated answer with citations
 */
async function getGoogleAIOverview(prompt: string, locationCode: number): Promise<{
  success: boolean;
  response: string;
  citations: Citation[];
  cost: number;
  error?: string;
}> {
  console.log("[Google AI Overview] Querying...");
  
  const data = await callDataForSEO("/serp/google/ai_overview/live/advanced", [{
    keyword: prompt,
    location_code: locationCode,
    language_code: "en",
    device: "desktop",
  }]);
  
  if (data.error) {
    return { success: false, response: "", citations: [], cost: 0, error: data.error };
  }
  
  const task = data?.tasks?.[0];
  const result = task?.result?.[0];
  const cost = task?.cost || 0;
  const items = result?.items || [];
  
  let response = "";
  const citations: Citation[] = [];
  
  // Process AI Overview items
  for (const item of items) {
    if (item.type === "ai_overview" && item.items) {
      for (const subItem of item.items) {
        if (subItem.text) response += subItem.text + "\n";
        if (subItem.references) {
          subItem.references.forEach((ref: any, idx: number) => {
            citations.push({
              url: ref.url || "",
              title: ref.title || "",
              domain: ref.domain || extractDomain(ref.url || ""),
              position: idx + 1,
              snippet: ref.snippet || "",
            });
          });
        }
      }
    }
  }
  
  response = response.trim();
  
  console.log(`[Google AI Overview] Got ${response.length} chars, ${citations.length} citations, cost: ${cost}`);
  
  return { success: response.length > 0, response, citations, cost };
}

/**
 * Get response from Groq Llama 3.1
 * Free tier with 14,400 requests/day
 */
async function getGroqResponse(prompt: string): Promise<{
  success: boolean;
  response: string;
  error?: string;
}> {
  if (!GROQ_API_KEY) {
    return { success: false, response: "", error: "GROQ_API_KEY not configured" };
  }
  
  console.log("[Groq Llama] Querying...");
  
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant providing recommendations. When asked:
- Provide a numbered list of 5-10 specific options
- Include brief explanations for each
- Mention specific brands/products by name
- Be balanced and informative
- Include pros and cons where relevant`
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      return { success: false, response: "", error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    console.log(`[Groq Llama] Got ${content.length} chars`);
    return { success: content.length > 0, response: content };
  } catch (err) {
    return { success: false, response: "", error: String(err) };
  }
}

// ============================================
// RESULT CREATION
// ============================================

/**
 * Create a standardized ModelResult from API response
 */
function createModelResult(
  modelId: string,
  config: { name: string; color: string; provider: string },
  success: boolean,
  response: string,
  citations: Citation[],
  cost: number,
  brandName: string,
  brandTags: string[],
  competitors: string[],
  error?: string
): ModelResult {
  const brandData = parseBrandData(response, brandName, brandTags);
  const competitorData = parseCompetitors(response, competitors);
  const winnerBrand = findWinnerBrand(response, brandName, competitors);
  
  return {
    model: modelId,
    model_name: config.name,
    provider: config.provider,
    color: config.color,
    success,
    error,
    raw_response: response,
    response_length: response.length,
    brand_mentioned: brandData.mentioned,
    brand_mention_count: brandData.count,
    brand_rank: brandData.rank,
    brand_sentiment: brandData.sentiment,
    matched_terms: brandData.matchedTerms,
    winner_brand: winnerBrand,
    competitors_found: competitorData as any[],
    citations,
    citation_count: citations.length,
    api_cost: cost,
  };
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { 
      client_id,
      prompt_id,
      prompt_text,
      brand_name,
      brand_tags = [],
      competitors = [],
      location_code = 2840,  // Default: United States
      models = ["google_serp", "google_ai_overview", "groq_llama"],
      save_to_db = false
    } = body;

    // Validate required fields
    if (!prompt_text || !brand_name) {
      return new Response(JSON.stringify({ error: "prompt_text and brand_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[GEO Audit] "${prompt_text.substring(0, 40)}..." | Brand: ${brand_name} | Models: ${models.join(", ")}`);

    const results: ModelResult[] = [];
    let totalCost = 0;

    // Run all queries in parallel for speed
    const promises: Promise<void>[] = [];

    if (models.includes("google_serp")) {
      promises.push((async () => {
        const serpResult = await getGoogleSERP(prompt_text, location_code);
        totalCost += serpResult.cost;
        results.push(createModelResult(
          "google_serp",
          MODEL_CONFIGS.google_serp,
          serpResult.success,
          serpResult.response,
          serpResult.citations,
          serpResult.cost,
          brand_name,
          brand_tags,
          competitors,
          serpResult.error
        ));
      })());
    }

    if (models.includes("google_ai_overview")) {
      promises.push((async () => {
        const aiResult = await getGoogleAIOverview(prompt_text, location_code);
        totalCost += aiResult.cost;
        results.push(createModelResult(
          "google_ai_overview",
          MODEL_CONFIGS.google_ai_overview,
          aiResult.success,
          aiResult.response,
          aiResult.citations,
          aiResult.cost,
          brand_name,
          brand_tags,
          competitors,
          aiResult.error
        ));
      })());
    }

    if (models.includes("groq_llama")) {
      promises.push((async () => {
        const groqResult = await getGroqResponse(prompt_text);
        results.push(createModelResult(
          "groq_llama",
          MODEL_CONFIGS.groq_llama,
          groqResult.success,
          groqResult.response,
          [],  // Groq doesn't provide citations
          0,   // Groq is free
          brand_name,
          brand_tags,
          competitors,
          groqResult.error
        ));
      })());
    }

    // Wait for all queries to complete
    await Promise.all(promises);

    // Calculate summary metrics
    const successfulResults = results.filter(r => r.success);
    const visibleCount = successfulResults.filter(r => r.brand_mentioned).length;
    const totalModels = successfulResults.length;
    const shareOfVoice = totalModels > 0 ? Math.round((visibleCount / totalModels) * 100) : 0;
    
    const rankedResults = successfulResults.filter(r => r.brand_rank);
    const avgRank = rankedResults.length > 0
      ? Math.round((rankedResults.reduce((sum, r) => sum + r.brand_rank!, 0) / rankedResults.length) * 10) / 10
      : null;

    // Aggregate citations by domain
    const citationMap = new Map<string, { count: number; citation: Citation }>();
    const competitorAgg = new Map<string, { count: number; ranks: number[] }>();
    
    for (const result of successfulResults) {
      for (const c of result.citations) {
        if (citationMap.has(c.domain)) {
          citationMap.get(c.domain)!.count++;
        } else {
          citationMap.set(c.domain, { count: 1, citation: c });
        }
      }
      for (const comp of result.competitors_found) {
        if (competitorAgg.has(comp.name)) {
          competitorAgg.get(comp.name)!.count += comp.count;
          if (comp.rank) competitorAgg.get(comp.name)!.ranks.push(comp.rank);
        } else {
          competitorAgg.set(comp.name, { count: comp.count, ranks: comp.rank ? [comp.rank] : [] });
        }
      }
    }

    // Build top sources list
    const topSources = Array.from(citationMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([domain, data]) => ({ domain, count: data.count, ...data.citation }));

    // Build top competitors list
    const topCompetitors = Array.from(competitorAgg.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        total_mentions: data.count,
        avg_rank: data.ranks.length > 0 
          ? Math.round((data.ranks.reduce((a, b) => a + b, 0) / data.ranks.length) * 10) / 10 
          : null,
      }));

    // Optionally save to database
    let saved_id = null;
    if (save_to_db && SUPABASE_URL && SUPABASE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        const { data: savedData, error: saveError } = await supabase
          .from("audit_results")
          .insert({
            client_id,
            prompt_id,
            prompt_text,
            brand_name,
            brand_tags,
            competitors,
            models_used: models,
            model_results: results,
            share_of_voice: shareOfVoice,
            average_rank: avgRank,
            total_citations: successfulResults.reduce((sum, r) => sum + r.citation_count, 0),
            total_cost: totalCost,
            top_sources: topSources,
            top_competitors: topCompetitors,
          })
          .select("id")
          .single();
        
        if (!saveError && savedData) saved_id = savedData.id;
      } catch (dbErr) {
        console.error("[DB] Save error:", dbErr);
      }
    }

    // Build response
    const responseData = {
      success: true,
      data: {
        id: saved_id,
        client_id,
        prompt_id,
        prompt_text,
        brand_name,
        brand_tags,
        competitors,
        models_requested: models,
        summary: {
          share_of_voice: shareOfVoice,
          average_rank: avgRank,
          total_models_checked: totalModels,
          models_failed: results.length - totalModels,
          visible_in: visibleCount,
          total_citations: successfulResults.reduce((sum, r) => sum + r.citation_count, 0),
          total_cost: totalCost,
        },
        model_results: results,
        top_sources: topSources,
        top_competitors: topCompetitors,
        available_models: Object.entries(MODEL_CONFIGS).map(([id, m]) => ({ id, ...m })),
        timestamp: new Date().toISOString(),
      },
    };

    console.log(`[GEO Audit] Done. SOV: ${shareOfVoice}%, Models: ${totalModels}/${results.length}, Cost: $${totalCost.toFixed(4)}`);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[GEO Audit] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
