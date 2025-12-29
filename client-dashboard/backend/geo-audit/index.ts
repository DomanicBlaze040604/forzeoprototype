// @ts-nocheck
/**
 * Forzeo GEO Audit API - Production Ready with LLM Mentions
 * 
 * Uses DataForSEO's LLM Mentions API to track AI visibility:
 * - LLM Mentions Search: Finds how brands are mentioned in AI answers
 * - Google AI Overview: Direct AI Overview results
 * - Google SERP: Traditional search results
 * 
 * "Forzeo does not query LLMs. It monitors how LLMs already talk about you."
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DATAFORSEO_API = "https://api.dataforseo.com/v3";
const DATAFORSEO_LOGIN = Deno.env.get("DATAFORSEO_LOGIN") || "";
const DATAFORSEO_PASSWORD = Deno.env.get("DATAFORSEO_PASSWORD") || "";
const DATAFORSEO_AUTH = btoa(`${DATAFORSEO_LOGIN}:${DATAFORSEO_PASSWORD}`);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ============================================
// MODEL CONFIGURATIONS
// ============================================

// Models available for querying
const AI_MODELS = {
  llm_mentions: { name: "LLM Mentions", color: "#10a37f", provider: "DataForSEO", weight: 1.0, costPerQuery: 0.1 },
  google_ai_overview: { name: "Google AI Overview", color: "#ea4335", provider: "DataForSEO", weight: 0.9, costPerQuery: 0.003 },
  google_serp: { name: "Google SERP", color: "#4285f4", provider: "DataForSEO", weight: 0.7, costPerQuery: 0.002 },
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
  color?: string;
  weight: number;
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
  is_cited: boolean;
  authority_type?: string;
  ai_search_volume?: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function extractDomain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return ""; }
}

function analyzeSentiment(context: string): "positive" | "neutral" | "negative" {
  const lower = context.toLowerCase();
  const pos = ["best", "top", "excellent", "recommended", "leading", "trusted", "popular", "great", "amazing", "reliable", "safe"].filter(w => lower.includes(w)).length;
  const neg = ["avoid", "poor", "worst", "bad", "unreliable", "scam", "fake", "terrible", "issues", "problems"].filter(w => lower.includes(w)).length;
  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}

function parseBrandData(response: string, brandName: string, brandTags: string[] = []) {
  const lower = response.toLowerCase();
  const allTerms = [brandName, ...brandTags];
  let totalCount = 0;
  const matchedTerms: string[] = [];
  
  for (const term of allTerms) {
    const termLower = term.toLowerCase();
    let idx = 0, count = 0;
    while ((idx = lower.indexOf(termLower, idx)) !== -1) { count++; idx++; }
    if (count > 0) { totalCount += count; matchedTerms.push(term); }
  }
  
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
  
  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  for (const term of allTerms) {
    const idx = lower.indexOf(term.toLowerCase());
    if (idx !== -1) {
      sentiment = analyzeSentiment(response.substring(Math.max(0, idx - 100), Math.min(response.length, idx + 100)));
      break;
    }
  }
  
  return { mentioned: totalCount > 0, count: totalCount, rank, sentiment, matchedTerms };
}

function parseCompetitors(response: string, competitors: string[]) {
  const lower = response.toLowerCase();
  return competitors.map(comp => {
    const compLower = comp.toLowerCase();
    let count = 0, idx = 0;
    while ((idx = lower.indexOf(compLower, idx)) !== -1) { count++; idx++; }
    
    if (count === 0) return null;
    
    let rank: number | null = null;
    for (const line of response.split('\n')) {
      const match = line.match(/^\s*(\d+)[.)\]]\s*\*{0,2}(.+)/);
      if (match && match[2].toLowerCase().includes(compLower)) {
        rank = parseInt(match[1]);
        break;
      }
    }
    
    const firstIdx = lower.indexOf(compLower);
    const context = response.substring(Math.max(0, firstIdx - 50), Math.min(response.length, firstIdx + 50));
    
    return { name: comp, count, rank, sentiment: analyzeSentiment(context) };
  }).filter(Boolean).sort((a: any, b: any) => b.count - a.count);
}

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
// DATAFORSEO API FUNCTIONS
// ============================================

/**
 * Generic DataForSEO API call
 */
async function callDataForSEO(endpoint: string, body: any): Promise<any> {
  console.log(`[DataForSEO] POST ${endpoint}`);
  console.log(`[DataForSEO] Auth: ${DATAFORSEO_LOGIN ? "configured" : "MISSING"}`);
  
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
      console.error(`[DataForSEO] HTTP ${response.status}: ${text.substring(0, 500)}`);
      return { error: `HTTP ${response.status}`, status_code: response.status, raw: text };
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
 * LLM Mentions Search API - Find how brands are mentioned in AI answers
 * 
 * This is the core endpoint for AI visibility tracking.
 * It searches DataForSEO's database of AI-generated answers to find mentions.
 * 
 * Endpoint: POST /v3/ai_optimization/llm_mentions/search/live
 */
async function getLLMMentions(
  keyword: string,
  targetDomain: string,
  brandName: string,
  brandTags: string[],
  locationCode: number = 2840
): Promise<{
  success: boolean;
  items: Array<{
    question: string;
    answer: string;
    sources: Citation[];
    ai_search_volume: number;
    brand_mentioned: boolean;
    brand_cited: boolean;
    brand_mention_count: number;
  }>;
  cost: number;
  error?: string;
}> {
  console.log(`[LLM Mentions] Searching: "${keyword}" | Domain: ${targetDomain} | Brand: ${brandName}`);
  
  // Build target array - just search for the keyword
  // We'll check for brand mentions in the results ourselves
  const targetArray: any[] = [
    {
      keyword: keyword,
      search_scope: ["answer"]  // Search in AI answers
    }
  ];
  
  const requestBody = [{
    language_name: "English",
    location_code: locationCode,
    target: targetArray,
    platform: "google",
    limit: 5,  // Reduced limit for faster response
  }];
  
  console.log(`[LLM Mentions] Request:`, JSON.stringify(requestBody, null, 2));
  
  const data = await callDataForSEO("/ai_optimization/llm_mentions/search/live", requestBody);
  
  if (data.error) {
    console.error(`[LLM Mentions] Error: ${data.error}`);
    return { success: false, items: [], cost: 0, error: data.error };
  }
  
  const task = data?.tasks?.[0];
  const cost = task?.cost || 0;
  const result = task?.result?.[0];
  const rawItems = result?.items || [];
  
  console.log(`[LLM Mentions] Got ${rawItems.length} items, cost: $${cost}`);
  
  const items: Array<{
    question: string;
    answer: string;
    sources: Citation[];
    ai_search_volume: number;
    brand_mentioned: boolean;
    brand_cited: boolean;
    brand_mention_count: number;
  }> = [];
  
  const allTerms = [brandName, targetDomain, ...brandTags].filter(Boolean).map(t => t.toLowerCase());
  
  for (const item of rawItems) {
    const answer = item.answer || "";
    const answerLower = answer.toLowerCase();
    
    // Parse sources
    const sources: Citation[] = (item.sources || []).map((s: any, idx: number) => ({
      url: s.url || "",
      title: s.title || "",
      domain: (s.domain || "").replace("www.", ""),
      position: s.position || idx + 1,
      snippet: s.snippet || "",
    }));
    
    // Check if brand is mentioned in the answer
    let brandMentioned = false;
    let brandMentionCount = 0;
    for (const term of allTerms) {
      if (!term) continue;
      let idx = 0;
      while ((idx = answerLower.indexOf(term, idx)) !== -1) {
        brandMentioned = true;
        brandMentionCount++;
        idx++;
      }
    }
    
    // Check if brand is cited (appears in sources)
    const brandCited = sources.some(s => 
      allTerms.some(term => 
        s.domain.toLowerCase().includes(term) || 
        s.url.toLowerCase().includes(term)
      )
    );
    
    items.push({
      question: item.question || keyword,
      answer: answer,
      sources: sources,
      ai_search_volume: item.ai_search_volume || 0,
      brand_mentioned: brandMentioned,
      brand_cited: brandCited,
      brand_mention_count: brandMentionCount,
    });
    
    console.log(`[LLM Mentions] Q: "${(item.question || "").substring(0, 50)}..." | Mentioned: ${brandMentioned} | Cited: ${brandCited} | Volume: ${item.ai_search_volume}`);
  }
  
  return { success: items.length > 0, items, cost };
}

/**
 * Google SERP Organic Results
 */
async function getGoogleSERP(prompt: string, locationCode: number): Promise<{
  success: boolean;
  response: string;
  citations: Citation[];
  cost: number;
  error?: string;
}> {
  console.log("[Google SERP] Querying...");
  
  const data = await callDataForSEO("/serp/google/organic/live/advanced", [{
    keyword: prompt,
    location_code: locationCode,
    language_code: "en",
    device: "desktop",
    depth: 30,
  }]);
  
  if (data.error) {
    return { success: false, response: "", citations: [], cost: 0, error: data.error };
  }
  
  const task = data?.tasks?.[0];
  const result = task?.result?.[0];
  const cost = task?.cost || 0;
  const items = result?.items || [];
  
  const parts: string[] = [];
  const citations: Citation[] = [];
  
  for (const item of items) {
    if (item.type === "featured_snippet") {
      parts.push(`=== Featured Answer ===\n${item.description || item.title || ""}`);
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
      citations.push({
        url: item.url,
        title: item.title,
        domain: item.domain,
        position: item.rank_absolute,
        snippet: item.description,
      });
    }
  }
  
  parts.push("\n=== Top Search Results ===");
  citations.slice(0, 10).forEach((c, i) => {
    parts.push(`${i + 1}. ${c.title}\n   ${c.snippet || ""}`);
  });
  
  const response = parts.join("\n\n").trim();
  console.log(`[Google SERP] Got ${response.length} chars, ${citations.length} citations, cost: $${cost}`);
  
  return { success: response.length > 0, response, citations, cost };
}

/**
 * Google AI Overview
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
  console.log(`[Google AI Overview] Got ${response.length} chars, ${citations.length} citations, cost: $${cost}`);
  
  return { success: response.length > 0, response, citations, cost };
}


// ============================================
// RESULT CREATION
// ============================================

function createModelResult(
  modelId: string,
  config: { name: string; color: string; provider: string; weight: number },
  success: boolean,
  response: string,
  citations: Citation[],
  cost: number,
  brandName: string,
  brandTags: string[],
  competitors: string[],
  error?: string,
  extraData?: {
    brand_mentioned?: boolean;
    brand_mention_count?: number;
    is_cited?: boolean;
    ai_search_volume?: number;
  }
): ModelResult {
  // Use provided data or parse from response
  let brandMentioned = extraData?.brand_mentioned ?? false;
  let brandMentionCount = extraData?.brand_mention_count ?? 0;
  let isCited = extraData?.is_cited ?? false;
  let matchedTerms: string[] = [];
  let brandRank: number | null = null;
  let brandSentiment: "positive" | "neutral" | "negative" = "neutral";
  
  if (!extraData && response) {
    const brandData = parseBrandData(response, brandName, brandTags);
    brandMentioned = brandData.mentioned;
    brandMentionCount = brandData.count;
    brandRank = brandData.rank;
    brandSentiment = brandData.sentiment;
    matchedTerms = brandData.matchedTerms;
  }
  
  const competitorData = response ? parseCompetitors(response, competitors) : [];
  const winnerBrand = response ? findWinnerBrand(response, brandName, competitors) : "";
  
  // Determine authority type
  let authorityType = "mentioned";
  if (isCited) {
    authorityType = brandMentionCount > 2 ? "authority" : "alternative";
  }
  
  return {
    model: modelId,
    model_name: config.name,
    provider: config.provider,
    color: config.color,
    weight: config.weight,
    success,
    error,
    raw_response: response,
    response_length: response.length,
    brand_mentioned: brandMentioned,
    brand_mention_count: brandMentionCount,
    brand_rank: brandRank,
    brand_sentiment: brandSentiment,
    matched_terms: matchedTerms,
    winner_brand: winnerBrand,
    competitors_found: competitorData as any[],
    citations,
    citation_count: citations.length,
    api_cost: cost,
    is_cited: isCited,
    authority_type: authorityType,
    ai_search_volume: extraData?.ai_search_volume,
  };
}

/**
 * Calculate AI Visibility Score (weighted)
 */
function calculateVisibilityScore(results: ModelResult[]): number {
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const result of results) {
    if (!result.success) continue;
    
    const weight = result.weight || 1.0;
    totalWeight += weight;
    
    let score = 0;
    if (result.brand_mentioned) {
      score = result.is_cited ? 100 : 50;
      if (result.brand_rank) {
        score += Math.max(0, 30 - (result.brand_rank - 1) * 10);
      }
      score += Math.min(20, result.brand_mention_count * 5);
    }
    
    weightedSum += score * weight;
  }
  
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

/**
 * Calculate AI Trust Index
 */
function calculateTrustIndex(results: ModelResult[]): number {
  let citedCount = 0;
  let authorityCount = 0;
  let total = 0;
  
  for (const result of results) {
    if (!result.success) continue;
    total++;
    if (result.is_cited) citedCount++;
    if (result.authority_type === "authority") authorityCount++;
  }
  
  if (total === 0) return 0;
  
  const citationRate = (citedCount / total) * 100;
  const authorityRate = (authorityCount / total) * 100;
  
  return Math.round(citationRate * 0.6 + authorityRate * 0.4);
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { 
      client_id, 
      prompt_id, 
      prompt_text, 
      brand_name, 
      brand_domain,
      brand_tags = [],
      competitors = [], 
      location_code = 2840,
      location_name = "United States",
      models = ["llm_mentions", "google_ai_overview"],
      save_to_db = false
    } = body;

    if (!prompt_text || !brand_name) {
      return new Response(JSON.stringify({ error: "prompt_text and brand_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetDomain = brand_domain || "";
    
    console.log(`[GEO Audit] "${prompt_text.substring(0, 50)}..." | Brand: ${brand_name} | Domain: ${targetDomain}`);
    console.log(`[GEO Audit] Models: ${models.join(", ")} | Location: ${location_code}`);

    const results: ModelResult[] = [];
    let totalCost = 0;
    const promises: Promise<void>[] = [];

    // Query LLM Mentions API
    if (models.includes("llm_mentions")) {
      promises.push((async () => {
        const llmResult = await getLLMMentions(
          prompt_text, 
          targetDomain, 
          brand_name, 
          brand_tags, 
          location_code
        );
        totalCost += llmResult.cost;
        
        if (llmResult.success && llmResult.items.length > 0) {
          // Aggregate results from all items
          let totalMentions = 0;
          let totalCited = false;
          let totalVolume = 0;
          const allCitations: Citation[] = [];
          const allAnswers: string[] = [];
          
          for (const item of llmResult.items) {
            if (item.brand_mentioned) totalMentions += item.brand_mention_count;
            if (item.brand_cited) totalCited = true;
            totalVolume += item.ai_search_volume;
            allCitations.push(...item.sources);
            allAnswers.push(`Q: ${item.question}\nA: ${item.answer}`);
          }
          
          results.push(createModelResult(
            "llm_mentions",
            AI_MODELS.llm_mentions,
            true,
            allAnswers.join("\n\n---\n\n"),
            allCitations,
            llmResult.cost,
            brand_name,
            brand_tags,
            competitors,
            undefined,
            {
              brand_mentioned: totalMentions > 0,
              brand_mention_count: totalMentions,
              is_cited: totalCited,
              ai_search_volume: totalVolume,
            }
          ));
        } else {
          results.push(createModelResult(
            "llm_mentions",
            AI_MODELS.llm_mentions,
            false,
            "",
            [],
            llmResult.cost,
            brand_name,
            brand_tags,
            competitors,
            llmResult.error || "No results found"
          ));
        }
      })());
    }

    // Query Google AI Overview
    if (models.includes("google_ai_overview")) {
      promises.push((async () => {
        const aiResult = await getGoogleAIOverview(prompt_text, location_code);
        totalCost += aiResult.cost;
        
        const brandData = parseBrandData(aiResult.response, brand_name, brand_tags);
        const isCited = aiResult.citations.some(c => 
          [brand_name, targetDomain, ...brand_tags].some(term => 
            term && (c.domain.toLowerCase().includes(term.toLowerCase()) || 
                    c.url.toLowerCase().includes(term.toLowerCase()))
          )
        );
        
        results.push(createModelResult(
          "google_ai_overview",
          AI_MODELS.google_ai_overview,
          aiResult.success,
          aiResult.response,
          aiResult.citations,
          aiResult.cost,
          brand_name,
          brand_tags,
          competitors,
          aiResult.error,
          {
            brand_mentioned: brandData.mentioned,
            brand_mention_count: brandData.count,
            is_cited: isCited,
          }
        ));
      })());
    }

    // Query Google SERP
    if (models.includes("google_serp")) {
      promises.push((async () => {
        const serpResult = await getGoogleSERP(prompt_text, location_code);
        totalCost += serpResult.cost;
        
        const brandData = parseBrandData(serpResult.response, brand_name, brand_tags);
        const isCited = serpResult.citations.some(c => 
          [brand_name, targetDomain, ...brand_tags].some(term => 
            term && (c.domain.toLowerCase().includes(term.toLowerCase()) || 
                    c.url.toLowerCase().includes(term.toLowerCase()))
          )
        );
        
        results.push(createModelResult(
          "google_serp",
          AI_MODELS.google_serp,
          serpResult.success,
          serpResult.response,
          serpResult.citations,
          serpResult.cost,
          brand_name,
          brand_tags,
          competitors,
          serpResult.error,
          {
            brand_mentioned: brandData.mentioned,
            brand_mention_count: brandData.count,
            is_cited: isCited,
          }
        ));
      })());
    }

    await Promise.all(promises);

    // Calculate metrics
    const successfulResults = results.filter(r => r.success);
    const visibleCount = successfulResults.filter(r => r.brand_mentioned).length;
    const citedCount = successfulResults.filter(r => r.is_cited).length;
    const totalModels = successfulResults.length;
    
    const shareOfVoice = totalModels > 0 ? Math.round((visibleCount / totalModels) * 100) : 0;
    
    const rankedResults = successfulResults.filter(r => r.brand_rank);
    const avgRank = rankedResults.length > 0
      ? Math.round((rankedResults.reduce((sum, r) => sum + r.brand_rank!, 0) / rankedResults.length) * 10) / 10
      : null;
    
    const visibilityScore = calculateVisibilityScore(results);
    const trustIndex = calculateTrustIndex(results);

    // Aggregate citations and competitors
    const citationMap = new Map<string, { count: number; citation: Citation }>();
    const competitorAgg = new Map<string, { count: number; ranks: number[] }>();
    
    for (const result of successfulResults) {
      for (const c of result.citations) {
        if (citationMap.has(c.domain)) citationMap.get(c.domain)!.count++;
        else citationMap.set(c.domain, { count: 1, citation: c });
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

    const topSources = Array.from(citationMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([domain, data]) => ({ domain, count: data.count, ...data.citation }));

    const topCompetitors = Array.from(competitorAgg.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        total_mentions: data.count,
        avg_rank: data.ranks.length > 0 ? Math.round((data.ranks.reduce((a, b) => a + b, 0) / data.ranks.length) * 10) / 10 : null,
      }));

    // Save to database if requested
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
            visibility_score: visibilityScore,
            trust_index: trustIndex,
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

    const responseData = {
      success: true,
      data: {
        id: saved_id,
        client_id,
        prompt_id,
        prompt_text,
        brand_name,
        brand_domain: targetDomain,
        brand_tags,
        competitors,
        models_requested: models,
        summary: {
          share_of_voice: shareOfVoice,
          visibility_score: visibilityScore,
          trust_index: trustIndex,
          average_rank: avgRank,
          total_models_checked: totalModels,
          models_failed: results.length - totalModels,
          visible_in: visibleCount,
          cited_in: citedCount,
          total_citations: successfulResults.reduce((sum, r) => sum + r.citation_count, 0),
          total_cost: totalCost,
        },
        model_results: results,
        top_sources: topSources,
        top_competitors: topCompetitors,
        available_models: Object.entries(AI_MODELS).map(([id, m]) => ({ id, ...m })),
        timestamp: new Date().toISOString(),
      },
    };

    console.log(`[GEO Audit] Done. SOV: ${shareOfVoice}%, Visibility: ${visibilityScore}, Trust: ${trustIndex}, Cost: $${totalCost.toFixed(4)}`);

    return new Response(JSON.stringify(responseData), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[GEO Audit] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
