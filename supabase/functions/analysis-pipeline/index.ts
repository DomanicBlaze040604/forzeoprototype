// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PipelineConfig {
  engines: string[];
  includeReddit: boolean;
  includeQuora: boolean;
  generateAnswers: boolean;
  detectMentions: boolean;
  calculateScores: boolean;
  verifyCitations: boolean;
}

interface PipelineResult {
  promptId: string;
  prompt: string;
  searchResults: any;
  aiAnswers: any[];
  mentionResults: any[];
  scores: any;
  citations: any[];
  status: "completed" | "partial" | "failed";
  errors: string[];
  processingTime: number;
}

const DEFAULT_CONFIG: PipelineConfig = {
  engines: ["google_sge", "bing_copilot"],
  includeReddit: true,
  includeQuora: true,
  generateAnswers: true,
  detectMentions: true,
  calculateScores: true,
  verifyCitations: false,
};

// Call internal edge function
async function callFunction(
  supabaseUrl: string,
  functionName: string,
  payload: any,
  serviceKey: string
): Promise<any> {
  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${functionName} failed: ${error}`);
  }
  
  return response.json();
}

// Track API usage for cost control
async function trackApiUsage(
  supabase: any,
  userId: string,
  apiName: string,
  action: string,
  costEstimate: number,
  responseTimeMs: number,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  try {
    await supabase.from("api_usage").insert({
      user_id: userId,
      api_name: apiName,
      action,
      cost_estimate: costEstimate,
      response_time_ms: responseTimeMs,
      success,
      error_message: errorMessage,
    });
  } catch (error) {
    console.error("Failed to track API usage:", error);
  }
}

// Check cost limits before proceeding
async function checkCostLimits(
  supabase: any,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const { data: alerts } = await supabase
      .from("cost_alerts")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (!alerts) return { allowed: true };
    
    // Get daily cost
    const { data: dailyCost } = await supabase.rpc("get_daily_api_cost", { p_user_id: userId });
    
    if (dailyCost >= alerts.daily_limit) {
      return { allowed: false, reason: `Daily limit of $${alerts.daily_limit} reached` };
    }
    
    // Get monthly cost
    const { data: monthlyCost } = await supabase.rpc("get_monthly_api_cost", { p_user_id: userId });
    
    if (monthlyCost >= alerts.monthly_limit) {
      return { allowed: false, reason: `Monthly limit of $${alerts.monthly_limit} reached` };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error("Cost check error:", error);
    return { allowed: true };
  }
}

// Store engine results
async function storeEngineResult(
  supabase: any,
  promptId: string,
  engine: string,
  result: any
): Promise<void> {
  try {
    await supabase.from("engine_results").insert({
      prompt_id: promptId,
      engine,
      raw_response: result.raw,
      parsed_response: result.parsed,
      brand_mentioned: result.brandMentioned,
      brand_position: result.brandPosition,
      citations: result.citations,
      entities: result.entities,
      sentiment: result.sentiment,
      confidence_score: result.confidence,
    });
  } catch (error) {
    console.error("Failed to store engine result:", error);
  }
}

// Update URL citations table
async function updateUrlCitations(
  supabase: any,
  userId: string,
  citations: Array<{ url: string; engine: string; promptId: string }>
): Promise<void> {
  for (const citation of citations) {
    try {
      const domain = new URL(citation.url).hostname;
      
      await supabase.rpc("upsert_url_citation", {
        p_user_id: userId,
        p_url: citation.url,
        p_domain: domain,
        p_engine: citation.engine,
        p_prompt_id: citation.promptId,
      });
    } catch (error) {
      console.error("Failed to update URL citation:", error);
    }
  }
}

// Main pipeline execution
async function executePipeline(
  supabase: any,
  supabaseUrl: string,
  serviceKey: string,
  userId: string,
  prompt: string,
  promptId: string,
  brand: any,
  competitors: any[],
  config: PipelineConfig
): Promise<PipelineResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const result: Partial<PipelineResult> = {
    promptId,
    prompt,
    aiAnswers: [],
    mentionResults: [],
    citations: [],
  };

  // Step 1: Multi-source search
  console.log("Step 1: Running multi-source search...");
  let searchStart = Date.now();
  try {
    result.searchResults = await callFunction(supabaseUrl, "multi-search", {
      query: prompt,
      country: "us",
      includeReddit: config.includeReddit,
      includeQuora: config.includeQuora,
    }, serviceKey);
    
    await trackApiUsage(supabase, userId, "multi-search", "search", 0.001, Date.now() - searchStart, true);
  } catch (error) {
    errors.push(`Search failed: ${error}`);
    await trackApiUsage(supabase, userId, "multi-search", "search", 0, Date.now() - searchStart, false, String(error));
  }

  // Step 2: Generate AI answers
  if (config.generateAnswers && result.searchResults) {
    console.log("Step 2: Generating AI answers...");
    let answerStart = Date.now();
    try {
      const answerResult = await callFunction(supabaseUrl, "ai-answer-generator", {
        query: prompt,
        searchContext: result.searchResults,
        styles: config.engines,
        preferredModel: "groq",
      }, serviceKey);
      
      result.aiAnswers = answerResult.answers || [];
      
      // Extract citations from answers
      for (const answer of result.aiAnswers) {
        for (const citation of answer.citations || []) {
          result.citations!.push({
            url: citation.url,
            title: citation.title,
            engine: answer.style,
            promptId,
            sentenceIndex: citation.sentenceIndex,
            relevanceScore: citation.relevanceScore,
          });
        }
      }
      
      await trackApiUsage(supabase, userId, "ai-answer-generator", "generate", 0.002, Date.now() - answerStart, true);
    } catch (error) {
      errors.push(`Answer generation failed: ${error}`);
      await trackApiUsage(supabase, userId, "ai-answer-generator", "generate", 0, Date.now() - answerStart, false, String(error));
    }
  }

  // Step 3: Detect brand mentions
  if (config.detectMentions && result.aiAnswers && result.aiAnswers.length > 0) {
    console.log("Step 3: Detecting brand mentions...");
    for (const answer of result.aiAnswers) {
      let mentionStart = Date.now();
      try {
        const mentionResult = await callFunction(supabaseUrl, "mention-detector", {
          text: answer.answer,
          brand: brand.name,
          brandAliases: brand.aliases || [],
          brandDomains: brand.domains || [],
          competitors: competitors.map(c => ({ name: c.name, aliases: c.aliases })),
          citations: answer.citations || [],
          useEnhancedDetection: true,
        }, serviceKey);
        
        result.mentionResults!.push({
          engine: answer.style,
          ...mentionResult.result,
        });
        
        // Store engine result
        await storeEngineResult(supabase, promptId, answer.style, {
          raw: answer,
          parsed: mentionResult.result,
          brandMentioned: mentionResult.result.mentioned,
          brandPosition: mentionResult.result.contexts[0]?.sentenceIndex,
          citations: answer.citations,
          entities: [],
          sentiment: mentionResult.result.sentiment,
          confidence: answer.confidence,
        });
        
        await trackApiUsage(supabase, userId, "mention-detector", "detect", 0.0005, Date.now() - mentionStart, true);
      } catch (error) {
        errors.push(`Mention detection failed for ${answer.style}: ${error}`);
      }
    }
  }

  // Step 4: Calculate scores
  if (config.calculateScores && result.mentionResults && result.mentionResults.length > 0) {
    console.log("Step 4: Calculating scores...");
    let scoreStart = Date.now();
    try {
      const engineResults = result.mentionResults.map(m => ({
        engine: m.engine,
        mentioned: m.mentioned,
        position: m.contexts[0]?.sentenceIndex,
        citationCount: m.citationFrequency * 10,
        sentiment: m.sentiment,
        sentimentScore: m.sentimentScore,
        competitorsMentioned: m.competitors.filter((c: any) => c.mentioned).length,
      }));
      
      const totalCitations = result.citations!.length;
      const brandCitations = result.citations!.filter(c => 
        brand.domains?.some((d: string) => c.url.includes(d))
      ).length;
      const competitorMentions = result.mentionResults.reduce(
        (sum, m) => sum + m.competitors.filter((c: any) => c.mentioned).length, 0
      );
      
      const scoreResult = await callFunction(supabaseUrl, "scoring-engine", {
        promptId,
        engineResults,
        totalCitations,
        brandCitations,
        competitorMentions,
        storeResult: true,
      }, serviceKey);
      
      result.scores = scoreResult.score;
      
      await trackApiUsage(supabase, userId, "scoring-engine", "score", 0.0001, Date.now() - scoreStart, true);
    } catch (error) {
      errors.push(`Scoring failed: ${error}`);
    }
  }

  // Step 5: Update URL citations
  if (result.citations && result.citations.length > 0) {
    console.log("Step 5: Updating URL citations...");
    await updateUrlCitations(supabase, userId, result.citations);
  }

  // Determine final status
  const status = errors.length === 0 ? "completed" : 
                 result.aiAnswers && result.aiAnswers.length > 0 ? "partial" : "failed";

  return {
    ...result,
    status,
    errors,
    processingTime: Date.now() - startTime,
  } as PipelineResult;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check cost limits
    const costCheck = await checkCostLimits(supabase, user.id);
    if (!costCheck.allowed) {
      return new Response(
        JSON.stringify({ error: costCheck.reason }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      prompt,
      promptId,
      brand,
      competitors = [],
      config = DEFAULT_CONFIG,
    } = await req.json();

    if (!prompt || !brand) {
      return new Response(
        JSON.stringify({ error: "prompt and brand are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting pipeline for prompt: "${prompt.slice(0, 50)}..."`);

    const result = await executePipeline(
      supabase,
      supabaseUrl,
      serviceKey,
      user.id,
      prompt,
      promptId || crypto.randomUUID(),
      brand,
      competitors,
      { ...DEFAULT_CONFIG, ...config }
    );

    console.log(`Pipeline completed in ${result.processingTime}ms with status: ${result.status}`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Pipeline error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
