// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// DataForSEO API Configuration
const DATAFORSEO_API_URL = "https://api.dataforseo.com/v3";

interface DataForSEOCredentials {
  login: string;
  password: string;
}

interface TaskPostRequest {
  endpoint: string;
  data: any[];
}

interface TaskGetRequest {
  endpoint: string;
  taskId: string;
}

// Get DataForSEO credentials from environment
function getCredentials(): DataForSEOCredentials {
  const login = Deno.env.get("DATAFORSEO_LOGIN");
  const password = Deno.env.get("DATAFORSEO_PASSWORD");
  
  if (!login || !password) {
    throw new Error("DataForSEO credentials not configured");
  }
  
  return { login, password };
}

// Create Basic Auth header
function getAuthHeader(creds: DataForSEOCredentials): string {
  const encoded = btoa(`${creds.login}:${creds.password}`);
  return `Basic ${encoded}`;
}

// DataForSEO API Client
class DataForSEOClient {
  private authHeader: string;
  
  constructor(creds: DataForSEOCredentials) {
    this.authHeader = getAuthHeader(creds);
  }
  
  // LLM Scraper - Task Post
  async llmScraperTaskPost(prompts: Array<{ prompt: string; engine?: string; tag?: string }>) {
    const tasks = prompts.map((p, idx) => ({
      prompt: p.prompt,
      engine: p.engine || "chatgpt",
      tag: p.tag || `task_${idx}`,
    }));
    
    return this.post("/content_generation/llm_scraper/task_post", tasks);
  }
  
  // LLM Scraper - Task Get
  async llmScraperTaskGet(taskId: string) {
    return this.get(`/content_generation/llm_scraper/task_get/${taskId}`);
  }
  
  // LLM Mentions - Task Post
  async llmMentionsTaskPost(data: Array<{ keyword: string; target: string; engine?: string }>) {
    const tasks = data.map((d, idx) => ({
      keyword: d.keyword,
      target: d.target,
      engine: d.engine || "chatgpt",
      tag: `mentions_${idx}`,
    }));
    
    return this.post("/content_generation/llm_mentions/task_post", tasks);
  }
  
  // LLM Mentions - Task Get
  async llmMentionsTaskGet(taskId: string) {
    return this.get(`/content_generation/llm_mentions/task_get/${taskId}`);
  }
  
  // AI Summary endpoint
  async aiSummary(text: string, maxLength?: number) {
    return this.post("/content_generation/ai_summary/live", [{
      text,
      max_length: maxLength || 500,
    }]);
  }
  
  // Google AI Mode - Task Post
  async googleAIModeTaskPost(queries: Array<{ keyword: string; location_code?: number; language_code?: string }>) {
    const tasks = queries.map((q, idx) => ({
      keyword: q.keyword,
      location_code: q.location_code || 2840, // US
      language_code: q.language_code || "en",
      tag: `ai_mode_${idx}`,
    }));
    
    return this.post("/serp/google/ai_mode/task_post", tasks);
  }
  
  // Google AI Mode - Task Get
  async googleAIModeTaskGet(taskId: string) {
    return this.get(`/serp/google/ai_mode/task_get/${taskId}`);
  }
  
  // Google SERP Advanced - HTML fetch for citation verification
  async serpAdvancedHtml(url: string) {
    return this.post("/serp/google/organic/task_post", [{
      url,
      fetch_html: true,
    }]);
  }
  
  // Account Balance
  async getAccountBalance() {
    return this.get("/appendix/user_data");
  }
  
  // Task Status Polling
  async getTaskStatus(taskId: string) {
    return this.get(`/appendix/status/${taskId}`);
  }
  
  private async post(endpoint: string, data: any[]) {
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

    const { action, ...params } = await req.json();
    
    let creds: DataForSEOCredentials;
    try {
      creds = getCredentials();
    } catch (e) {
      // Return mock data if credentials not configured
      return new Response(
        JSON.stringify({ 
          error: "DataForSEO not configured",
          mock: true,
          message: "Using simulated data. Configure DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to use real API."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const client = new DataForSEOClient(creds);
    let result;
    
    switch (action) {
      case "llm_scraper_post":
        result = await client.llmScraperTaskPost(params.prompts);
        break;
      case "llm_scraper_get":
        result = await client.llmScraperTaskGet(params.taskId);
        break;
      case "llm_mentions_post":
        result = await client.llmMentionsTaskPost(params.data);
        break;
      case "llm_mentions_get":
        result = await client.llmMentionsTaskGet(params.taskId);
        break;
      case "ai_summary":
        result = await client.aiSummary(params.text, params.maxLength);
        break;
      case "google_ai_mode_post":
        result = await client.googleAIModeTaskPost(params.queries);
        break;
      case "google_ai_mode_get":
        result = await client.googleAIModeTaskGet(params.taskId);
        break;
      case "serp_html":
        result = await client.serpAdvancedHtml(params.url);
        break;
      case "account_balance":
        result = await client.getAccountBalance();
        break;
      case "task_status":
        result = await client.getTaskStatus(params.taskId);
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
    
    // Log API usage for cost tracking
    await supabaseClient.from("api_usage").insert({
      user_id: user.id,
      api_name: "dataforseo",
      action,
      cost_estimate: estimateCost(action),
      created_at: new Date().toISOString(),
    }).catch(console.error);
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("DataForSEO client error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Estimate cost per API call (in USD)
function estimateCost(action: string): number {
  const costs: Record<string, number> = {
    llm_scraper_post: 0.02,
    llm_scraper_get: 0.001,
    llm_mentions_post: 0.02,
    llm_mentions_get: 0.001,
    ai_summary: 0.01,
    google_ai_mode_post: 0.015,
    google_ai_mode_get: 0.001,
    serp_html: 0.003,
    account_balance: 0,
    task_status: 0,
  };
  return costs[action] || 0.01;
}
