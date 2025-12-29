// @ts-nocheck - Deno types not available in IDE
/**
 * FORZEO MVP Backend - Execute Prompt (Enhanced DataForSEO)
 * 
 * Uses multiple DataForSEO endpoints for comprehensive data:
 * 1. SERP Google Organic - Search results with featured snippets
 * 2. AI Overview - ChatGPT-style AI summaries (when available)
 * 3. People Also Ask - Related questions
 * 
 * Falls back to Groq for AI-generated responses
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DATAFORSEO_API_URL = "https://api.dataforseo.com/v3";

interface ExecutePromptRequest {
  prompt: string;
  brand: string;
  competitors?: string[];
}

interface Citation {
  url: string;
  title: string;
  domain: string;
  snippet?: string;
  position?: number;
}

interface BrandMention {
  text: string;
  position: number;
  context: string;
  sentiment: "positive" | "neutral" | "negative";
}

interface CompetitorMention {
  name: string;
  count: number;
  positions: number[];
  sentiment: "positive" | "neutral" | "negative";
}

interface OrderedList {
  items: string[];
  brandPosition: number | null;
  competitorPositions: { name: string; position: number }[];
}

interface ParsedEntities {
  brandMentions: BrandMention[];
  competitorMentions: CompetitorMention[];
  orderedLists: OrderedList[];
  citations: Citation[];
}

interface SourceResult {
  source: string;
  raw_response: string;
  parsed_entities: ParsedEntities;
  metadata: {
    response_length: number;
    brand_mention_count: number;
    competitor_mention_count: number;
    list_count: number;
    citation_count: number;
    cost?: number;
  };
}

// DataForSEO Client with full API support
class DataForSEOClient {
  private authHeader: string;
  private login: string;
  private password: string;

  constructor() {
    this.login = Deno.env.get("DATAFORSEO_LOGIN") || "mk7164798@gmail.com";
    this.password = Deno.env.get("DATAFORSEO_PASSWORD") || "cbff5fd8a868f23c";
    
    const base64Auth = Deno.env.get("DATAFORSEO_AUTH");
    if (base64Auth) {
      this.authHeader = `Basic ${base64Auth}`;
    } else {
      const credentials = `${this.login}:${this.password}`;
      this.authHeader = `Basic ${btoa(credentials)}`;
    }
    
    console.log(`[DataForSEO] Initialized with login: ${this.login}`);
  }

  async checkBalance(): Promise<{ balance: number; available: boolean; error?: string }> {
    try {
      const response = await fetch(`${DATAFORSEO_API_URL}/appendix/user_data`, {
        method: "GET",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { balance: 0, available: false, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      
      if (data.status_code !== 20000) {
        return { balance: 0, available: false, error: data.status_message };
      }

      const balance = data?.tasks?.[0]?.result?.[0]?.money?.balance || 0;
      console.log(`[DataForSEO] Balance: $${balance.toFixed(2)}`);
      
      return { balance, available: balance > 0.01 };
    } catch (error) {
      console.error("[DataForSEO] Balance check error:", error);
      return { balance: 0, available: false, error: String(error) };
    }
  }

  // SERP Google Organic - Main search results with all item types
  async getSerpOrganic(keyword: string): Promise<{
    success: boolean;
    organicResults: any[];
    featuredSnippet: any | null;
    peopleAlsoAsk: any[];
    relatedSearches: any[];
    knowledgeGraph: any | null;
    cost: number;
    error?: string;
  }> {
    try {
      console.log(`[DataForSEO] SERP Organic for: "${keyword}"`);
      
      const requestBody = [{
        keyword: keyword,
        location_code: 2356, // India
        language_code: "en",
        device: "desktop",
        os: "windows",
        depth: 100, // Get more results
      }];

      const response = await fetch(`${DATAFORSEO_API_URL}/serp/google/organic/live/advanced`, {
        method: "POST",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error("[DataForSEO] SERP failed:", response.status);
        return { success: false, organicResults: [], featuredSnippet: null, peopleAlsoAsk: [], relatedSearches: [], knowledgeGraph: null, cost: 0, error: `HTTP ${response.status}` };
      }

      const data = JSON.parse(responseText);
      
      if (data.status_code !== 20000) {
        return { success: false, organicResults: [], featuredSnippet: null, peopleAlsoAsk: [], relatedSearches: [], knowledgeGraph: null, cost: 0, error: data.status_message };
      }

      const task = data?.tasks?.[0];
      const result = task?.result?.[0];
      const cost = task?.cost || 0;
      const items = result?.items || [];

      // Parse different item types
      const organicResults: any[] = [];
      let featuredSnippet: any = null;
      const peopleAlsoAsk: any[] = [];
      const relatedSearches: any[] = [];
      let knowledgeGraph: any = null;

      for (const item of items) {
        switch (item.type) {
          case "organic":
            organicResults.push({
              position: item.rank_absolute,
              title: item.title,
              url: item.url,
              domain: item.domain,
              description: item.description,
              snippet: item.description,
            });
            break;
          case "featured_snippet":
            featuredSnippet = {
              title: item.title,
              description: item.description,
              url: item.url,
              domain: item.domain,
            };
            break;
          case "people_also_ask":
            if (item.items) {
              for (const paa of item.items) {
                peopleAlsoAsk.push({
                  question: paa.title,
                  answer: paa.description || paa.expanded_element?.description,
                  url: paa.url,
                });
              }
            }
            break;
          case "related_searches":
            if (item.items) {
              for (const rs of item.items) {
                relatedSearches.push(rs.title || rs.query);
              }
            }
            break;
          case "knowledge_graph":
            knowledgeGraph = {
              title: item.title,
              description: item.description,
              url: item.url,
            };
            break;
        }
      }

      console.log(`[DataForSEO] SERP: ${organicResults.length} organic, featured: ${!!featuredSnippet}, PAA: ${peopleAlsoAsk.length}, cost: $${cost}`);

      return {
        success: true,
        organicResults,
        featuredSnippet,
        peopleAlsoAsk,
        relatedSearches,
        knowledgeGraph,
        cost,
      };
    } catch (error) {
      console.error("[DataForSEO] SERP error:", error);
      return { success: false, organicResults: [], featuredSnippet: null, peopleAlsoAsk: [], relatedSearches: [], knowledgeGraph: null, cost: 0, error: String(error) };
    }
  }

  // AI Overview endpoint
  async getAIOverview(keyword: string): Promise<{
    success: boolean;
    response: string;
    citations: Citation[];
    cost: number;
    error?: string;
  }> {
    try {
      console.log(`[DataForSEO] AI Overview for: "${keyword}"`);
      
      const requestBody = [{
        keyword: keyword,
        location_code: 2356,
        language_code: "en",
        device: "desktop",
        os: "windows",
      }];

      const response = await fetch(`${DATAFORSEO_API_URL}/serp/google/ai_overview/live/advanced`, {
        method: "POST",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        return { success: false, response: "", citations: [], cost: 0, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      
      if (data.status_code !== 20000) {
        return { success: false, response: "", citations: [], cost: 0, error: data.status_message };
      }

      const task = data?.tasks?.[0];
      const result = task?.result?.[0];
      const cost = task?.cost || 0;
      const items = result?.items || [];

      let aiResponse = "";
      const citations: Citation[] = [];

      for (const item of items) {
        if (item.type === "ai_overview" && item.items) {
          for (const subItem of item.items) {
            if (subItem.text) {
              aiResponse += subItem.text + "\n";
            }
            if (subItem.references) {
              for (const ref of subItem.references) {
                citations.push({
                  url: ref.url || "",
                  title: ref.title || "",
                  domain: ref.domain || "",
                  snippet: ref.snippet || "",
                });
              }
            }
          }
        }
      }

      console.log(`[DataForSEO] AI Overview: ${aiResponse.length} chars, ${citations.length} citations, cost: $${cost}`);

      return { success: aiResponse.length > 0, response: aiResponse.trim(), citations, cost };
    } catch (error) {
      console.error("[DataForSEO] AI Overview error:", error);
      return { success: false, response: "", citations: [], cost: 0, error: String(error) };
    }
  }
}

// Groq fallback
async function getGroqResponse(prompt: string): Promise<{ success: boolean; response?: string; error?: string }> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  
  if (!apiKey) {
    return { success: false, error: "GROQ_API_KEY not configured" };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a helpful AI assistant. When asked for recommendations:
- Provide a numbered list of 5-10 specific options
- Include brief explanations for each
- Mention specific brands/products by name
- Be balanced and informative`
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log(`[Groq] Response: ${content?.length || 0} chars`);
    return { success: !!content, response: content };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// Sentiment analysis
function analyzeSentiment(context: string): "positive" | "neutral" | "negative" {
  const lower = context.toLowerCase();
  
  const positive = ["best", "top", "excellent", "great", "recommended", "leading", "popular", "trusted", "safe", "secure", "reliable", "premium", "favorite", "award", "winner"];
  const negative = ["avoid", "poor", "limited", "expensive", "worst", "bad", "slow", "unreliable", "outdated", "fake", "scam", "issues", "problems"];

  const posCount = positive.filter(w => lower.includes(w)).length;
  const negCount = negative.filter(w => lower.includes(w)).length;

  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  return "neutral";
}

// Extract domain from URL
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

// Parse entities from text
function parseEntities(text: string, brand: string, competitors: string[], existingCitations: Citation[] = []): ParsedEntities {
  const textLower = text.toLowerCase();
  const brandLower = brand.toLowerCase();

  // Brand mentions
  const brandMentions: BrandMention[] = [];
  let searchIdx = 0;
  while (true) {
    const idx = textLower.indexOf(brandLower, searchIdx);
    if (idx === -1) break;
    
    const contextStart = Math.max(0, idx - 50);
    const contextEnd = Math.min(text.length, idx + brandLower.length + 50);
    const context = text.substring(contextStart, contextEnd);
    
    brandMentions.push({
      text: text.substring(idx, idx + brand.length),
      position: idx,
      context,
      sentiment: analyzeSentiment(context),
    });
    searchIdx = idx + 1;
  }

  // Competitor mentions
  const competitorMentions: CompetitorMention[] = [];
  for (const comp of competitors) {
    const compLower = comp.toLowerCase();
    const positions: number[] = [];
    let compIdx = 0;
    while (true) {
      const idx = textLower.indexOf(compLower, compIdx);
      if (idx === -1) break;
      positions.push(idx);
      compIdx = idx + 1;
    }
    if (positions.length > 0) {
      const ctx = text.substring(Math.max(0, positions[0] - 30), Math.min(text.length, positions[0] + comp.length + 30));
      competitorMentions.push({
        name: comp,
        count: positions.length,
        positions,
        sentiment: analyzeSentiment(ctx),
      });
    }
  }

  // Ordered lists
  const orderedLists: OrderedList[] = [];
  let currentList: string[] = [];
  let lastNum = 0;

  for (const line of text.split('\n')) {
    const match = line.match(/^\s*(\d+)[.)\]]\s*\*{0,2}(.+)/);
    if (match) {
      const num = parseInt(match[1]);
      const item = match[2].trim();
      if (num === 1 || num === lastNum + 1) {
        if (num === 1 && currentList.length > 0) {
          orderedLists.push(createOrderedList(currentList, brand, competitors));
          currentList = [];
        }
        currentList.push(item);
        lastNum = num;
      }
    }
  }
  if (currentList.length > 0) {
    orderedLists.push(createOrderedList(currentList, brand, competitors));
  }

  // Citations - combine existing + extract from text
  const citations: Citation[] = [...existingCitations];
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const urls = text.match(urlPattern) || [];
  for (const url of urls) {
    if (!citations.find(c => c.url === url)) {
      citations.push({ url, title: "", domain: extractDomain(url) });
    }
  }

  return { brandMentions, competitorMentions, orderedLists, citations };
}

function createOrderedList(items: string[], brand: string, competitors: string[]): OrderedList {
  const brandLower = brand.toLowerCase();
  let brandPosition: number | null = null;
  const competitorPositions: { name: string; position: number }[] = [];

  items.forEach((item, idx) => {
    const itemLower = item.toLowerCase();
    if (itemLower.includes(brandLower) && brandPosition === null) {
      brandPosition = idx + 1;
    }
    for (const comp of competitors) {
      if (itemLower.includes(comp.toLowerCase()) && !competitorPositions.find(cp => cp.name === comp)) {
        competitorPositions.push({ name: comp, position: idx + 1 });
      }
    }
  });

  return { items, brandPosition, competitorPositions };
}

// Build comprehensive response from DataForSEO data
function buildDataForSEOResponse(
  serpData: { organicResults: any[]; featuredSnippet: any; peopleAlsoAsk: any[]; relatedSearches: any[]; knowledgeGraph: any },
  aiOverview: { response: string; citations: Citation[] }
): { response: string; citations: Citation[] } {
  const parts: string[] = [];
  const allCitations: Citation[] = [];

  // AI Overview first (if available)
  if (aiOverview.response) {
    parts.push("=== AI Overview ===");
    parts.push(aiOverview.response);
    parts.push("");
    allCitations.push(...aiOverview.citations);
  }

  // Featured Snippet
  if (serpData.featuredSnippet) {
    parts.push("=== Featured Answer ===");
    parts.push(serpData.featuredSnippet.description || serpData.featuredSnippet.title);
    if (serpData.featuredSnippet.url) {
      allCitations.push({
        url: serpData.featuredSnippet.url,
        title: serpData.featuredSnippet.title || "",
        domain: serpData.featuredSnippet.domain || extractDomain(serpData.featuredSnippet.url),
        snippet: serpData.featuredSnippet.description,
        position: 0,
      });
    }
    parts.push("");
  }

  // Knowledge Graph
  if (serpData.knowledgeGraph) {
    parts.push("=== Knowledge Panel ===");
    parts.push(`${serpData.knowledgeGraph.title}: ${serpData.knowledgeGraph.description || ""}`);
    parts.push("");
  }

  // Top Organic Results
  if (serpData.organicResults.length > 0) {
    parts.push("=== Top Search Results ===");
    const topResults = serpData.organicResults.slice(0, 10);
    topResults.forEach((result, idx) => {
      parts.push(`${idx + 1}. ${result.title}`);
      if (result.description) {
        parts.push(`   ${result.description}`);
      }
      allCitations.push({
        url: result.url,
        title: result.title,
        domain: result.domain,
        snippet: result.description,
        position: result.position,
      });
    });
    parts.push("");
  }

  // People Also Ask
  if (serpData.peopleAlsoAsk.length > 0) {
    parts.push("=== People Also Ask ===");
    serpData.peopleAlsoAsk.slice(0, 5).forEach(paa => {
      parts.push(`Q: ${paa.question}`);
      if (paa.answer) {
        parts.push(`A: ${paa.answer}`);
      }
    });
    parts.push("");
  }

  // Related Searches
  if (serpData.relatedSearches.length > 0) {
    parts.push("=== Related Searches ===");
    parts.push(serpData.relatedSearches.slice(0, 8).join(", "));
  }

  return {
    response: parts.join("\n").trim(),
    citations: allCitations,
  };
}

// Main handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), 
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const body: ExecutePromptRequest = await req.json();
    const { prompt, brand, competitors = [] } = body;

    if (!prompt?.trim() || !brand?.trim()) {
      return new Response(JSON.stringify({ success: false, error: "prompt and brand are required" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`[execute-prompt] Query: "${prompt}", Brand: "${brand}"`);

    const results: { dataforseo: SourceResult | null; groq: SourceResult | null; combined: SourceResult | null } = {
      dataforseo: null,
      groq: null,
      combined: null,
    };

    let totalCost = 0;
    let balance = 0;

    // 1. DataForSEO - Get comprehensive search data
    const dfClient = new DataForSEOClient();
    const balanceCheck = await dfClient.checkBalance();
    balance = balanceCheck.balance;

    if (balanceCheck.available) {
      // Run SERP and AI Overview in parallel
      const [serpResult, aiOverviewResult] = await Promise.all([
        dfClient.getSerpOrganic(prompt),
        dfClient.getAIOverview(prompt),
      ]);

      totalCost += serpResult.cost + aiOverviewResult.cost;

      // Build comprehensive response
      const dfResponse = buildDataForSEOResponse(
        {
          organicResults: serpResult.organicResults,
          featuredSnippet: serpResult.featuredSnippet,
          peopleAlsoAsk: serpResult.peopleAlsoAsk,
          relatedSearches: serpResult.relatedSearches,
          knowledgeGraph: serpResult.knowledgeGraph,
        },
        {
          response: aiOverviewResult.response,
          citations: aiOverviewResult.citations,
        }
      );

      if (dfResponse.response) {
        const parsed = parseEntities(dfResponse.response, brand, competitors, dfResponse.citations);
        
        results.dataforseo = {
          source: "dataforseo_comprehensive",
          raw_response: dfResponse.response,
          parsed_entities: parsed,
          metadata: {
            response_length: dfResponse.response.length,
            brand_mention_count: parsed.brandMentions.length,
            competitor_mention_count: parsed.competitorMentions.reduce((s, c) => s + c.count, 0),
            list_count: parsed.orderedLists.length,
            citation_count: parsed.citations.length,
            cost: totalCost,
          },
        };

        console.log(`[DataForSEO] Success: ${parsed.brandMentions.length} brand mentions, ${parsed.citations.length} citations`);
      }
    } else {
      console.log(`[DataForSEO] Skipped - balance: $${balance.toFixed(2)}`);
    }

    // 2. Groq fallback/comparison
    const groqResult = await getGroqResponse(prompt);
    
    if (groqResult.success && groqResult.response) {
      const parsed = parseEntities(groqResult.response, brand, competitors);
      
      results.groq = {
        source: "groq_llama",
        raw_response: groqResult.response,
        parsed_entities: parsed,
        metadata: {
          response_length: groqResult.response.length,
          brand_mention_count: parsed.brandMentions.length,
          competitor_mention_count: parsed.competitorMentions.reduce((s, c) => s + c.count, 0),
          list_count: parsed.orderedLists.length,
          citation_count: parsed.citations.length,
        },
      };
    }

    // 3. Combined result
    const primary = results.dataforseo || results.groq;
    
    if (primary) {
      const combinedText = [results.dataforseo?.raw_response, results.groq?.raw_response].filter(Boolean).join("\n\n---\n\n");
      const combinedCitations = [
        ...(results.dataforseo?.parsed_entities.citations || []),
        ...(results.groq?.parsed_entities.citations || []),
      ];
      const combinedParsed = parseEntities(combinedText, brand, competitors, combinedCitations);

      results.combined = {
        source: results.dataforseo ? "dataforseo_primary" : "groq_primary",
        raw_response: primary.raw_response,
        parsed_entities: combinedParsed,
        metadata: {
          response_length: combinedText.length,
          brand_mention_count: combinedParsed.brandMentions.length,
          competitor_mention_count: combinedParsed.competitorMentions.reduce((s, c) => s + c.count, 0),
          list_count: combinedParsed.orderedLists.length,
          citation_count: combinedParsed.citations.length,
          cost: totalCost,
        },
      };
    }

    if (!results.dataforseo && !results.groq) {
      return new Response(JSON.stringify({ success: false, error: "Both DataForSEO and Groq failed" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const responseData = {
      success: true,
      data: {
        prompt,
        brand,
        competitors,
        raw_response: primary!.raw_response,
        parsed_entities: primary!.parsed_entities,
        metadata: {
          data_source: primary!.source,
          response_length: primary!.metadata.response_length,
          brand_mention_count: primary!.metadata.brand_mention_count,
          competitor_mention_count: primary!.metadata.competitor_mention_count,
          list_count: primary!.metadata.list_count,
          citation_count: primary!.metadata.citation_count,
          total_cost: totalCost,
          dataforseo_balance: balance,
          timestamp: new Date().toISOString(),
        },
        sources: results,
      },
    };

    console.log(`[execute-prompt] Done. DataForSEO: ${!!results.dataforseo}, Groq: ${!!results.groq}, Citations: ${primary!.parsed_entities.citations.length}`);

    return new Response(JSON.stringify(responseData), 
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("[execute-prompt] Error:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
