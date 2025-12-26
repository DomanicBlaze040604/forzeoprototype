// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DATAFORSEO_API_URL = "https://api.dataforseo.com/v3";

// DataForSEO API Client with balance checking and fallback
class DataForSEOService {
  private authHeader: string | null = null;
  private balance: number | null = null;
  private lastBalanceCheck: number = 0;
  private BALANCE_CHECK_INTERVAL = 60000; // 1 minute
  private MIN_BALANCE_THRESHOLD = 0; // Use DataForSEO until balance hits $0

  constructor() {
    const base64Auth = Deno.env.get("DATAFORSEO_AUTH");
    if (base64Auth) {
      this.authHeader = `Basic ${base64Auth}`;
    }
  }

  isConfigured(): boolean {
    return this.authHeader !== null;
  }

  async checkBalance(): Promise<{ available: boolean; balance: number; reason?: string }> {
    if (!this.authHeader) {
      return { available: false, balance: 0, reason: "DataForSEO not configured" };
    }

    // Cache balance check
    const now = Date.now();
    if (this.balance !== null && now - this.lastBalanceCheck < this.BALANCE_CHECK_INTERVAL) {
      return { 
        available: this.balance > this.MIN_BALANCE_THRESHOLD, 
        balance: this.balance,
        reason: this.balance <= this.MIN_BALANCE_THRESHOLD ? "Balance exhausted" : undefined
      };
    }

    try {
      const response = await fetch(`${DATAFORSEO_API_URL}/appendix/user_data`, {
        method: "GET",
        headers: {
          "Authorization": this.authHeader,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return { available: false, balance: 0, reason: `API error: ${response.status}` };
      }

      const data = await response.json();
      this.balance = data?.tasks?.[0]?.result?.[0]?.money?.balance || 0;
      this.lastBalanceCheck = now;

      return {
        available: this.balance > this.MIN_BALANCE_THRESHOLD,
        balance: this.balance,
        reason: this.balance <= this.MIN_BALANCE_THRESHOLD ? "Balance exhausted" : undefined
      };
    } catch (error) {
      console.error("Balance check error:", error);
      return { available: false, balance: 0, reason: error.message };
    }
  }

  // LLM Scraper - Get AI responses from multiple engines
  async llmScraperTaskPost(prompts: Array<{ prompt: string; engine?: string; tag?: string }>) {
    const tasks = prompts.map((p, idx) => ({
      prompt: p.prompt,
      engine: p.engine || "chatgpt",
      tag: p.tag || `task_${idx}`,
    }));
    return this.post("/content_generation/llm_scraper/task_post", tasks);
  }

  async llmScraperTaskGet(taskId: string) {
    return this.get(`/content_generation/llm_scraper/task_get/${taskId}`);
  }

  // LLM Mentions - Track brand mentions across AI engines
  async llmMentionsTaskPost(data: Array<{ keyword: string; target: string; engine?: string }>) {
    const tasks = data.map((d, idx) => ({
      keyword: d.keyword,
      target: d.target,
      engine: d.engine || "chatgpt",
      tag: `mentions_${idx}`,
    }));
    return this.post("/content_generation/llm_mentions/task_post", tasks);
  }

  async llmMentionsTaskGet(taskId: string) {
    return this.get(`/content_generation/llm_mentions/task_get/${taskId}`);
  }

  // Google AI Mode - Access Google's AI search results
  async googleAIModeTaskPost(queries: Array<{ keyword: string; location_code?: number; language_code?: string }>) {
    const tasks = queries.map((q, idx) => ({
      keyword: q.keyword,
      location_code: q.location_code || 2840,
      language_code: q.language_code || "en",
      tag: `ai_mode_${idx}`,
    }));
    return this.post("/serp/google/ai_mode/task_post", tasks);
  }

  async googleAIModeTaskGet(taskId: string) {
    return this.get(`/serp/google/ai_mode/task_get/${taskId}`);
  }

  // SERP API - Google organic search
  async serpGoogleOrganicLive(keyword: string, locationCode: number = 2840) {
    return this.post("/serp/google/organic/live/advanced", [{
      keyword,
      location_code: locationCode,
      language_code: "en",
      device: "desktop",
      os: "windows",
    }]);
  }

  // Keyword Data - Search volume and competition
  async keywordDataLive(keywords: string[], locationCode: number = 2840) {
    return this.post("/keywords_data/google_ads/search_volume/live", [{
      keywords,
      location_code: locationCode,
      language_code: "en",
    }]);
  }

  // Domain Analytics - Competitor analysis
  async domainAnalyticsOverview(domain: string) {
    return this.post("/domain_analytics/overview/live", [{
      target: domain,
      location_code: 2840,
      language_code: "en",
    }]);
  }

  // Backlinks - Domain authority
  async backlinksOverview(target: string) {
    return this.post("/backlinks/summary/live", [{
      target,
      internal_list_limit: 10,
      backlinks_status_type: "live",
    }]);
  }

  // Content Analysis - Sentiment and topics
  async contentAnalysisSentiment(keyword: string) {
    return this.post("/content_analysis/sentiment_analysis/live", [{
      keyword,
      page_type: ["ecommerce", "news", "blogs", "message-boards", "organization"],
    }]);
  }

  // OnPage - Website audit
  async onPageInstantPages(url: string) {
    return this.post("/on_page/instant_pages", [{
      url,
      enable_javascript: true,
      load_resources: true,
    }]);
  }

  private async post(endpoint: string, data: any[]) {
    if (!this.authHeader) throw new Error("DataForSEO not configured");
    
    const response = await fetch(`${DATAFORSEO_API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Authorization": this.authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DataForSEO API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  private async get(endpoint: string) {
    if (!this.authHeader) throw new Error("DataForSEO not configured");
    
    const response = await fetch(`${DATAFORSEO_API_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "Authorization": this.authHeader,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DataForSEO API error: ${response.status} - ${error}`);
    }

    return response.json();
  }
}

// Fallback service using Groq + Serper
class FallbackService {
  private groqApiKey: string | null;
  private serperApiKey: string | null;

  constructor() {
    this.groqApiKey = Deno.env.get("GROQ_API_KEY") || null;
    this.serperApiKey = Deno.env.get("SERPER_API_KEY") || null;
  }

  async simulateLLMResponse(prompt: string, engine: string): Promise<string> {
    if (!this.groqApiKey) {
      return `Simulated response for "${prompt}" from ${engine}`;
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { 
            role: "system", 
            content: `You are simulating how ${engine} would respond to a user query. Respond naturally and helpfully.` 
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) throw new Error("Groq API error");
    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async searchSerp(query: string): Promise<any> {
    if (!this.serperApiKey) {
      return { organic: [], answerBox: null };
    }

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": this.serperApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 10 }),
    });

    if (!response.ok) throw new Error("Serper API error");
    return response.json();
  }

  async detectMentions(text: string, brand: string, competitors: string[]): Promise<any> {
    const textLower = text.toLowerCase();
    const brandLower = brand.toLowerCase();
    
    return {
      brandMentioned: textLower.includes(brandLower),
      mentionCount: (textLower.match(new RegExp(brandLower, 'g')) || []).length,
      competitorsMentioned: competitors.filter(c => textLower.includes(c.toLowerCase())),
    };
  }
}

// Main enhanced analysis function
async function runEnhancedAnalysis(
  prompt: string,
  brand: string,
  competitors: string[],
  options: {
    engines?: string[];
    includeSerp?: boolean;
    includeKeywordData?: boolean;
    includeDomainAnalysis?: boolean;
    includeBacklinks?: boolean;
    includeSentiment?: boolean;
  } = {}
) {
  const dataForSEO = new DataForSEOService();
  const fallback = new FallbackService();
  
  const {
    engines = ["chatgpt", "gemini", "perplexity", "claude"],
    includeSerp = true,
    includeKeywordData = true,
    includeDomainAnalysis = false,
    includeBacklinks = false,
    includeSentiment = true,
  } = options;

  // Check DataForSEO availability
  const balanceCheck = await dataForSEO.checkBalance();
  const useDataForSEO = balanceCheck.available;
  
  console.log(`DataForSEO available: ${useDataForSEO}, Balance: $${balanceCheck.balance}`);

  const results: any = {
    source: useDataForSEO ? "dataforseo" : "fallback",
    balance: balanceCheck.balance,
    llmResponses: [],
    serpData: null,
    keywordData: null,
    domainAnalysis: null,
    backlinks: null,
    sentimentAnalysis: null,
    brandMentions: null,
  };

  try {
    if (useDataForSEO) {
      // === USE DATAFORSEO APIs ===
      
      // 1. LLM Scraper - Get real AI responses
      console.log("Using DataForSEO LLM Scraper...");
      const llmTasks = engines.map(engine => ({
        prompt,
        engine,
        tag: `${brand}_${engine}`,
      }));
      
      const llmPostResult = await dataForSEO.llmScraperTaskPost(llmTasks);
      const taskIds = llmPostResult?.tasks?.map((t: any) => t.id) || [];
      
      // Poll for results (with timeout)
      for (const taskId of taskIds) {
        if (!taskId) continue;
        let attempts = 0;
        while (attempts < 30) {
          await new Promise(r => setTimeout(r, 2000));
          const taskResult = await dataForSEO.llmScraperTaskGet(taskId);
          if (taskResult?.tasks?.[0]?.status_code === 20000) {
            const result = taskResult.tasks[0].result?.[0];
            if (result) {
              results.llmResponses.push({
                engine: result.engine,
                response: result.response,
                citations: result.citations || [],
              });
            }
            break;
          }
          attempts++;
        }
      }

      // 2. LLM Mentions - Track brand mentions
      console.log("Using DataForSEO LLM Mentions...");
      const mentionsTasks = engines.map(engine => ({
        keyword: prompt,
        target: brand,
        engine,
      }));
      
      try {
        const mentionsResult = await dataForSEO.llmMentionsTaskPost(mentionsTasks);
        results.brandMentions = mentionsResult;
      } catch (e) {
        console.log("LLM Mentions not available:", e.message);
      }

      // 3. Google AI Mode - AI search results
      if (includeSerp) {
        console.log("Using DataForSEO Google AI Mode...");
        try {
          const aiModeResult = await dataForSEO.googleAIModeTaskPost([{ keyword: prompt }]);
          results.serpData = { aiMode: aiModeResult };
          
          // Also get regular SERP
          const serpResult = await dataForSEO.serpGoogleOrganicLive(prompt);
          results.serpData.organic = serpResult;
        } catch (e) {
          console.log("SERP API error:", e.message);
        }
      }

      // 4. Keyword Data - Search volume
      if (includeKeywordData) {
        console.log("Using DataForSEO Keyword Data...");
        try {
          const keywordResult = await dataForSEO.keywordDataLive([prompt, brand, ...competitors.slice(0, 3)]);
          results.keywordData = keywordResult;
        } catch (e) {
          console.log("Keyword Data error:", e.message);
        }
      }

      // 5. Domain Analytics (if brand has a domain)
      if (includeDomainAnalysis && brand.includes(".")) {
        console.log("Using DataForSEO Domain Analytics...");
        try {
          const domainResult = await dataForSEO.domainAnalyticsOverview(brand);
          results.domainAnalysis = domainResult;
        } catch (e) {
          console.log("Domain Analytics error:", e.message);
        }
      }

      // 6. Backlinks
      if (includeBacklinks && brand.includes(".")) {
        console.log("Using DataForSEO Backlinks...");
        try {
          const backlinksResult = await dataForSEO.backlinksOverview(brand);
          results.backlinks = backlinksResult;
        } catch (e) {
          console.log("Backlinks error:", e.message);
        }
      }

      // 7. Content Sentiment Analysis
      if (includeSentiment) {
        console.log("Using DataForSEO Sentiment Analysis...");
        try {
          const sentimentResult = await dataForSEO.contentAnalysisSentiment(brand);
          results.sentimentAnalysis = sentimentResult;
        } catch (e) {
          console.log("Sentiment Analysis error:", e.message);
        }
      }

    } else {
      // === USE FALLBACK (Groq + Serper) ===
      console.log("Using fallback services (Groq + Serper)...");
      
      // 1. Simulate LLM responses using Groq
      for (const engine of engines) {
        try {
          const response = await fallback.simulateLLMResponse(prompt, engine);
          const mentions = await fallback.detectMentions(response, brand, competitors);
          
          results.llmResponses.push({
            engine,
            response,
            brandMentioned: mentions.brandMentioned,
            mentionCount: mentions.mentionCount,
            competitorsMentioned: mentions.competitorsMentioned,
            source: "groq_simulation",
          });
        } catch (e) {
          console.log(`Fallback error for ${engine}:`, e.message);
        }
      }

      // 2. SERP search using Serper
      if (includeSerp) {
        try {
          const serpResult = await fallback.searchSerp(prompt);
          results.serpData = {
            organic: serpResult.organic || [],
            answerBox: serpResult.answerBox,
            source: "serper",
          };
        } catch (e) {
          console.log("Serper fallback error:", e.message);
        }
      }

      // 3. Brand mention analysis
      const allResponses = results.llmResponses.map((r: any) => r.response).join(" ");
      results.brandMentions = await fallback.detectMentions(allResponses, brand, competitors);
    }

    // Calculate visibility metrics
    const mentionedCount = results.llmResponses.filter((r: any) => 
      r.brandMentioned || r.response?.toLowerCase().includes(brand.toLowerCase())
    ).length;
    
    results.metrics = {
      visibilityScore: Math.round((mentionedCount / engines.length) * 100),
      enginesAnalyzed: engines.length,
      brandMentionedIn: mentionedCount,
      dataSource: results.source,
      fallbackReason: !useDataForSEO ? balanceCheck.reason : null,
    };

  } catch (error) {
    console.error("Enhanced analysis error:", error);
    results.error = error.message;
  }

  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
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

    const { action, ...params } = await req.json();

    let result;

    switch (action) {
      case "analyze":
        // Full enhanced analysis
        result = await runEnhancedAnalysis(
          params.prompt,
          params.brand,
          params.competitors || [],
          params.options || {}
        );
        break;

      case "check_balance":
        // Just check DataForSEO balance
        const dataForSEO = new DataForSEOService();
        result = await dataForSEO.checkBalance();
        break;

      case "llm_scrape":
        // Direct LLM scraping
        const scraper = new DataForSEOService();
        const balanceOk = await scraper.checkBalance();
        if (!balanceOk.available) {
          // Fallback to Groq
          const fb = new FallbackService();
          result = {
            source: "fallback",
            responses: await Promise.all(
              (params.engines || ["chatgpt"]).map(async (engine: string) => ({
                engine,
                response: await fb.simulateLLMResponse(params.prompt, engine),
              }))
            ),
          };
        } else {
          result = await scraper.llmScraperTaskPost(
            (params.engines || ["chatgpt"]).map((engine: string) => ({
              prompt: params.prompt,
              engine,
            }))
          );
          result.source = "dataforseo";
        }
        break;

      case "serp_search":
        // SERP search with fallback
        const serpService = new DataForSEOService();
        const serpBalance = await serpService.checkBalance();
        if (!serpBalance.available) {
          const fb = new FallbackService();
          result = await fb.searchSerp(params.query);
          result.source = "serper_fallback";
        } else {
          result = await serpService.serpGoogleOrganicLive(params.query, params.locationCode);
          result.source = "dataforseo";
        }
        break;

      case "keyword_data":
        // Keyword research
        const kwService = new DataForSEOService();
        const kwBalance = await kwService.checkBalance();
        if (!kwBalance.available) {
          result = { error: "DataForSEO balance exhausted", fallback: "not_available" };
        } else {
          result = await kwService.keywordDataLive(params.keywords, params.locationCode);
        }
        break;

      case "domain_analysis":
        // Domain analytics
        const domainService = new DataForSEOService();
        const domainBalance = await domainService.checkBalance();
        if (!domainBalance.available) {
          result = { error: "DataForSEO balance exhausted", fallback: "not_available" };
        } else {
          result = await domainService.domainAnalyticsOverview(params.domain);
        }
        break;

      case "backlinks":
        // Backlinks analysis
        const blService = new DataForSEOService();
        const blBalance = await blService.checkBalance();
        if (!blBalance.available) {
          result = { error: "DataForSEO balance exhausted", fallback: "not_available" };
        } else {
          result = await blService.backlinksOverview(params.target);
        }
        break;

      case "sentiment":
        // Content sentiment analysis
        const sentService = new DataForSEOService();
        const sentBalance = await sentService.checkBalance();
        if (!sentBalance.available) {
          result = { error: "DataForSEO balance exhausted", fallback: "not_available" };
        } else {
          result = await sentService.contentAnalysisSentiment(params.keyword);
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Log API usage
    await supabaseClient.from("api_usage").insert({
      user_id: user.id,
      api_name: result?.source === "dataforseo" ? "dataforseo" : "fallback",
      action,
      cost_estimate: result?.source === "dataforseo" ? estimateCost(action) : 0,
      created_at: new Date().toISOString(),
    }).catch(console.error);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("DataForSEO Enhanced error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function estimateCost(action: string): number {
  const costs: Record<string, number> = {
    analyze: 0.10,
    llm_scrape: 0.02,
    serp_search: 0.003,
    keyword_data: 0.01,
    domain_analysis: 0.02,
    backlinks: 0.02,
    sentiment: 0.01,
    check_balance: 0,
  };
  return costs[action] || 0.01;
}
