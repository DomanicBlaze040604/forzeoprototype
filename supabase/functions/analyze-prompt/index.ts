// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DATAFORSEO_API_URL = "https://api.dataforseo.com/v3";

// DataForSEO Service with balance checking
class DataForSEOService {
  private authHeader: string | null = null;
  private balance: number | null = null;
  private lastBalanceCheck: number = 0;

  constructor() {
    const base64Auth = Deno.env.get("DATAFORSEO_AUTH");
    if (base64Auth) {
      this.authHeader = `Basic ${base64Auth}`;
    }
  }

  isConfigured(): boolean {
    return this.authHeader !== null;
  }

  async checkBalance(): Promise<{ available: boolean; balance: number }> {
    if (!this.authHeader) return { available: false, balance: 0 };

    const now = Date.now();
    if (this.balance !== null && now - this.lastBalanceCheck < 60000) {
      return { available: this.balance > 0, balance: this.balance };
    }

    try {
      const response = await fetch(`${DATAFORSEO_API_URL}/appendix/user_data`, {
        method: "GET",
        headers: { "Authorization": this.authHeader, "Content-Type": "application/json" },
      });
      if (!response.ok) return { available: false, balance: 0 };
      const data = await response.json();
      this.balance = data?.tasks?.[0]?.result?.[0]?.money?.balance || 0;
      this.lastBalanceCheck = now;
      return { available: this.balance > 0, balance: this.balance };
    } catch {
      return { available: false, balance: 0 };
    }
  }

  async llmScraperTaskPost(prompts: Array<{ prompt: string; engine: string }>) {
    return this.post("/content_generation/llm_scraper/task_post", prompts);
  }

  async llmScraperTaskGet(taskId: string) {
    return this.get(`/content_generation/llm_scraper/task_get/${taskId}`);
  }

  async serpGoogleOrganicLive(keyword: string) {
    return this.post("/serp/google/organic/live/advanced", [{
      keyword, location_code: 2840, language_code: "en", device: "desktop",
    }]);
  }

  private async post(endpoint: string, data: any[]) {
    if (!this.authHeader) throw new Error("Not configured");
    const response = await fetch(`${DATAFORSEO_API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Authorization": this.authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }

  private async get(endpoint: string) {
    if (!this.authHeader) throw new Error("Not configured");
    const response = await fetch(`${DATAFORSEO_API_URL}${endpoint}`, {
      method: "GET",
      headers: { "Authorization": this.authHeader, "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }
}

interface AnalyzeRequest {
  prompt: string;
  brand: string;
  models?: string[];
  competitors?: string[];
  persona?: string;
}

interface SerpResult {
  organic: Array<{ title: string; link: string; snippet: string; position: number }>;
  aiOverview: string | null;
  brandMentioned: boolean;
  brandPosition: number | null;
  competitors: Array<{ name: string; position: number }>;
}

// Persona system prompts for multi-persona simulation
const PERSONA_PROMPTS: Record<string, string> = {
  CTO: "You are a Chief Technology Officer evaluating enterprise software solutions. Focus on scalability, security, integration capabilities, and long-term technical roadmap.",
  Developer: "You are a software developer looking for practical tools. Focus on developer experience, documentation quality, API design, and community support.",
  Student: "You are a student on a budget looking for accessible tools. Focus on free tiers, learning resources, ease of use, and career relevance.",
  Investor: "You are an investor evaluating market opportunities. Focus on market position, growth trajectory, competitive moat, and business model sustainability.",
  Manager: "You are a project manager evaluating team tools. Focus on collaboration features, onboarding ease, reporting capabilities, and team adoption rates.",
};

async function callSerpSearch(prompt: string, brand: string, competitors: string[]): Promise<SerpResult | null> {
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log("Supabase credentials not available for SERP search");
      return null;
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/serp-search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: prompt,
        brand,
        competitors,
      }),
    });

    if (!response.ok) {
      console.error("SERP search failed:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error calling SERP search:", error);
    return null;
  }
}

// Call Groq API (Llama 3.1 - fast and free)
async function callLLM(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }

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
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Judge-LLM: Analyzes an AI response for brand mentions, accuracy, and sentiment
async function judgeLLMAnalysis(
  response: string,
  brand: string,
  competitors: string[],
  prompt: string
): Promise<{
  brandMentioned: boolean;
  sentiment: string | null;
  accuracy: number;
  reasoning: string;
  rank: number | null;
  competitorsMentioned: string[];
}> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const systemPrompt = "You are a Judge-LLM that provides structured brand visibility analysis. Always respond with valid JSON only.";
  
  const judgePrompt = `Analyze the following AI response to the user query: "${prompt}"

AI Response to analyze:
"""
${response}
"""

Target brand to find: "${brand}"
Competitor brands to check: ${competitors.join(', ') || 'None specified'}

Respond with ONLY a JSON object (no markdown, no explanation) with these exact fields:
{
  "brand_mentioned": true/false,
  "sentiment": "positive" | "neutral" | "negative" | null,
  "accuracy": 0-100,
  "reasoning": "Brief explanation",
  "rank": number or null,
  "competitors_mentioned": ["competitor1", "competitor2"]
}`;

  try {
    const rawResponse = await callLLM(judgePrompt, systemPrompt);
    
    // Parse JSON from response
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        brandMentioned: analysis.brand_mentioned ?? false,
        sentiment: analysis.sentiment || null,
        accuracy: analysis.accuracy ?? 50,
        reasoning: analysis.reasoning || "Analysis complete",
        rank: analysis.rank || null,
        competitorsMentioned: analysis.competitors_mentioned || [],
      };
    }

    return fallbackAnalysis(response, brand, competitors);
  } catch (error) {
    console.error("Judge-LLM error:", error);
    return fallbackAnalysis(response, brand, competitors);
  }
}

// Fallback analysis when Judge-LLM fails
function fallbackAnalysis(response: string, brand: string, competitors: string[]) {
  const brandLower = brand.toLowerCase();
  const responseLower = response.toLowerCase();
  const brandMentioned = responseLower.includes(brandLower);

  let sentiment: string | null = null;
  let accuracy = 50;
  
  if (brandMentioned) {
    const positiveWords = ['best', 'excellent', 'great', 'top', 'recommended', 'leading', 'popular', 'powerful', 'robust'];
    const negativeWords = ['avoid', 'poor', 'limited', 'expensive', 'complex', 'difficult', 'lacking'];
    
    const hasPositive = positiveWords.some(w => responseLower.includes(w));
    const hasNegative = negativeWords.some(w => responseLower.includes(w));
    
    if (hasPositive && !hasNegative) {
      sentiment = 'positive';
      accuracy = 75;
    } else if (hasNegative && !hasPositive) {
      sentiment = 'negative';
      accuracy = 60;
    } else {
      sentiment = 'neutral';
      accuracy = 65;
    }
  }

  let rank: number | null = null;
  if (brandMentioned) {
    const brandIndex = responseLower.indexOf(brandLower);
    const textBefore = responseLower.substring(0, brandIndex);
    const competitorsBefore = competitors.filter(c => textBefore.includes(c.toLowerCase())).length;
    rank = competitorsBefore + 1;
  }

  const competitorsMentioned = competitors.filter(c => responseLower.includes(c.toLowerCase()));

  return {
    brandMentioned,
    sentiment,
    accuracy,
    reasoning: brandMentioned 
      ? sentiment === 'positive' ? 'Brand mentioned positively' : sentiment === 'negative' ? 'Brand mentioned negatively' : 'Brand mentioned neutrally'
      : 'Brand not mentioned in response',
    rank,
    competitorsMentioned,
  };
}

// Simulate what an AI model would respond to this prompt with persona support
// Uses DataForSEO LLM Scraper when available, falls back to Groq simulation
async function queryAIModel(
  prompt: string,
  brand: string,
  competitors: string[],
  modelName: string,
  persona: string = "general",
  dataForSEOService?: DataForSEOService
): Promise<{
  response: string;
  brandMentioned: boolean;
  sentiment: string | null;
  accuracy: number;
  reasoning: string;
  rank: number | null;
  competitorsMentioned: string[];
  source: string;
}> {
  // Map model names to DataForSEO engine names
  const engineMap: Record<string, string> = {
    "ChatGPT": "chatgpt",
    "Gemini": "gemini",
    "Perplexity": "perplexity",
    "Claude": "claude",
  };

  let aiResponse = "";
  let source = "groq_simulation";

  // Try DataForSEO first if available
  if (dataForSEOService) {
    try {
      const engine = engineMap[modelName] || "chatgpt";
      console.log(`Attempting DataForSEO LLM Scraper for ${modelName} (${engine})...`);
      
      // Use task_post and poll for results with shorter timeout for better UX
      const postResult = await dataForSEOService.llmScraperTaskPost([{
        prompt,
        engine,
      }]);
      
      const taskId = postResult?.tasks?.[0]?.id;
      const taskCost = postResult?.tasks?.[0]?.cost;
      console.log(`DataForSEO task created: ${taskId}, cost: $${taskCost}`);
      
      if (taskId) {
        // Poll for result with shorter timeout (20 seconds max for better UX)
        // DataForSEO LLM Scraper can take 30-60 seconds, so we'll check a few times
        // and fall back to Groq if it's taking too long
        for (let i = 0; i < 10; i++) {
          await new Promise(r => setTimeout(r, 2000)); // 2 second intervals
          
          try {
            const getResult = await dataForSEOService.llmScraperTaskGet(taskId);
            const statusCode = getResult?.tasks?.[0]?.status_code;
            
            if (statusCode === 20000) {
              const result = getResult.tasks[0].result?.[0];
              if (result?.response) {
                aiResponse = result.response;
                source = "dataforseo_llm_scraper";
                console.log(`Got real ${modelName} response via DataForSEO (${result.response.length} chars)`);
                break;
              }
            } else if (statusCode >= 40000) {
              // Task failed
              console.log(`DataForSEO task failed with status: ${statusCode}`);
              break;
            }
            // Status 20100 = "Task In Queue", keep polling
          } catch (pollError) {
            console.log(`Poll error: ${pollError.message}`);
          }
        }
        
        // If we didn't get a response, log that we're falling back
        if (!aiResponse) {
          console.log(`DataForSEO task ${taskId} still processing, falling back to Groq for faster response`);
        }
      }
    } catch (error) {
      console.log(`DataForSEO LLM Scraper error for ${modelName}: ${error.message}`);
    }
  }

  // Fallback to Groq simulation if DataForSEO didn't work
  if (!aiResponse) {
    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      return {
        response: `Unable to get response from ${modelName}`,
        brandMentioned: false,
        sentiment: null,
        accuracy: 0,
        reasoning: "No API key configured",
        rank: null,
        competitorsMentioned: [],
        source: "error",
      };
    }

    const personaContext = PERSONA_PROMPTS[persona] || "";
    const systemPrompt = `You are simulating how ${modelName} would respond to a user query.
${personaContext ? `The user has this persona: ${personaContext}` : ""}
Respond naturally as if you ARE ${modelName} answering this question directly.
Keep your response focused, helpful, and around 150-200 words.
If the query is about recommendations or "best" options, provide a list of options with brief explanations.`;

    try {
      aiResponse = await callLLM(prompt, systemPrompt);
      source = "groq_simulation";
    } catch (error) {
      console.error(`Error querying ${modelName}:`, error);
      return {
        response: `Error getting response from ${modelName}`,
        brandMentioned: false,
        sentiment: null,
        accuracy: 0,
        reasoning: "Error occurred during analysis",
        rank: null,
        competitorsMentioned: [],
        source: "error",
      };
    }
  }

  if (!aiResponse) {
    return {
      response: `Unable to get response from ${modelName}`,
      brandMentioned: false,
      sentiment: null,
      accuracy: 0,
      reasoning: "Model query failed",
      rank: null,
      competitorsMentioned: [],
      source: "error",
    };
  }

  // Use Judge-LLM for analysis
  const analysis = await judgeLLMAnalysis(aiResponse, brand, competitors, prompt);

  return {
    response: aiResponse,
    ...analysis,
    source,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header for user context (optional - allows anonymous analysis)
    const authHeader = req.headers.get("Authorization");
    let supabaseClient = null;
    let userId: string | null = null;

    if (authHeader) {
      supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id || null;
    }

    const { 
      prompt, 
      brand, 
      models = ['ChatGPT', 'Gemini', 'Perplexity', 'Claude'],
      competitors = [],
      persona = 'general'
    } = await req.json() as AnalyzeRequest;

    if (!prompt || !brand) {
      return new Response(
        JSON.stringify({ error: 'Prompt and brand are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing prompt: "${prompt}" for brand: "${brand}" with persona: "${persona}"`);

    // Initialize DataForSEO service and check balance
    const dataForSEO = new DataForSEOService();
    let useDataForSEO = false;
    let dataForSEOBalance = 0;

    if (dataForSEO.isConfigured()) {
      const balanceCheck = await dataForSEO.checkBalance();
      useDataForSEO = balanceCheck.available;
      dataForSEOBalance = balanceCheck.balance;
      console.log(`DataForSEO: configured=${true}, available=${useDataForSEO}, balance=$${dataForSEOBalance.toFixed(3)}`);
    } else {
      console.log("DataForSEO not configured, using Groq simulation");
    }

    // Call SERP search in parallel - use DataForSEO SERP if available (it's faster - live endpoint)
    let serpPromise;
    if (useDataForSEO) {
      serpPromise = dataForSEO.serpGoogleOrganicLive(prompt)
        .then(result => {
          // Transform DataForSEO SERP result to our format
          const organic = result?.tasks?.[0]?.result?.[0]?.items?.filter((i: any) => i.type === "organic") || [];
          const brandLower = brand.toLowerCase();
          let brandMentioned = false;
          let brandPosition: number | null = null;
          
          for (const item of organic) {
            const text = `${item.title} ${item.description}`.toLowerCase();
            if (text.includes(brandLower)) {
              brandMentioned = true;
              brandPosition = item.rank_absolute;
              break;
            }
          }
          
          return {
            organic: organic.slice(0, 5).map((item: any) => ({
              title: item.title,
              link: item.url,
              snippet: item.description,
              position: item.rank_absolute,
            })),
            aiOverview: null,
            brandMentioned,
            brandPosition,
            competitors: competitors.map(c => {
              const compLower = c.toLowerCase();
              for (const item of organic) {
                const text = `${item.title} ${item.description}`.toLowerCase();
                if (text.includes(compLower)) {
                  return { name: c, position: item.rank_absolute };
                }
              }
              return null;
            }).filter(Boolean),
          };
        })
        .catch(e => {
          console.log("DataForSEO SERP failed, falling back to Serper:", e.message);
          return callSerpSearch(prompt, brand, competitors);
        });
    } else {
      serpPromise = callSerpSearch(prompt, brand, competitors);
    }

    // Query AI for each model to get realistic responses with Judge-LLM analysis
    // Also insert analysis_jobs for War Room real-time tracking
    const modelResults = await Promise.all(
      models.map(async (modelName) => {
        // Create analysis job record if user is authenticated
        let jobId: string | null = null;
        if (supabaseClient && userId) {
          try {
            const { data: job } = await supabaseClient
              .from("analysis_jobs")
              .insert({
                user_id: userId,
                prompt_text: prompt,
                model: modelName,
                persona: persona,
                phase: "thinking",
              })
              .select("id")
              .single();
            jobId = job?.id || null;
          } catch (e) {
            console.log("Could not create analysis job:", e);
          }
        }

        // Pass DataForSEO service if available
        const result = await queryAIModel(
          prompt, 
          brand, 
          competitors, 
          modelName, 
          persona,
          useDataForSEO ? dataForSEO : undefined
        );
        
        // Update analysis job with results
        if (supabaseClient && jobId) {
          try {
            await supabaseClient
              .from("analysis_jobs")
              .update({
                phase: "complete",
                brand_mentioned: result.brandMentioned,
                sentiment: result.sentiment,
                accuracy: result.accuracy,
                reasoning: result.reasoning,
                completed_at: new Date().toISOString(),
              })
              .eq("id", jobId);
          } catch (e) {
            console.log("Could not update analysis job:", e);
          }
        }

        return {
          model: modelName,
          brand_mentioned: result.brandMentioned,
          sentiment: result.sentiment,
          accuracy: result.accuracy,
          reasoning: result.reasoning,
          rank: result.rank,
          response_snippet: result.response.substring(0, 500),
          full_response: result.response,
          citations: [],
          competitors_in_response: result.competitorsMentioned,
          data_source: result.source,
        };
      })
    );

    // Calculate visibility score based on actual mentions
    const mentionCount = modelResults.filter(r => r.brand_mentioned).length;
    const avgAccuracy = modelResults
      .filter(r => r.accuracy > 0)
      .reduce((sum, r) => sum + r.accuracy, 0) / (mentionCount || 1);
    const avgRank = modelResults
      .filter(r => r.rank !== null)
      .reduce((sum, r) => sum + (r.rank || 0), 0) / (mentionCount || 1);
    
    let overallVisibilityScore = Math.round((mentionCount / models.length) * 100);
    
    // Adjust for rank and accuracy
    if (mentionCount > 0) {
      const rankBonus = Math.max(0, 20 - (avgRank * 4));
      const accuracyBonus = (avgAccuracy - 50) * 0.3;
      overallVisibilityScore = Math.min(100, Math.round(overallVisibilityScore + rankBonus + accuracyBonus));
    }

    // Collect all competitors mentioned across models
    const allCompetitorsMentioned = [...new Set(
      modelResults.flatMap(r => r.competitors_in_response)
    )];

    // Generate recommendations based on analysis
    const recommendations: string[] = [];
    
    if (mentionCount === 0) {
      recommendations.push(`${brand} is not appearing in AI responses for this query. Focus on building authoritative content that addresses "${prompt}" directly.`);
      recommendations.push("Create comprehensive guides, reviews, and comparison content to increase visibility.");
    } else if (mentionCount < models.length / 2) {
      recommendations.push(`${brand} appears in ${mentionCount} of ${models.length} AI models. Work on increasing presence across all major AI platforms.`);
    }

    // Add sentiment-based recommendations
    const negativeMentions = modelResults.filter(r => r.sentiment === 'negative').length;
    if (negativeMentions > 0) {
      recommendations.push(`${negativeMentions} AI model(s) mention ${brand} with negative sentiment. Review brand messaging and address common complaints.`);
    }

    // Add accuracy-based recommendations
    if (avgAccuracy < 60 && mentionCount > 0) {
      recommendations.push(`Low accuracy score (${Math.round(avgAccuracy)}%). Ensure your online presence has accurate, up-to-date information.`);
    }

    if (allCompetitorsMentioned.length > mentionCount) {
      recommendations.push(`Competitors (${allCompetitorsMentioned.join(', ')}) are mentioned more frequently. Analyze their content strategy.`);
    }

    recommendations.push("Encourage customer reviews on platforms like G2, Capterra, and Trustpilot - these are frequently referenced by AI models.");

    // Wait for SERP results and merge
    const serpResult = await serpPromise;
    
    let serp_data;
    if (serpResult) {
      console.log(`SERP search complete. Brand in SERP: ${serpResult.brandMentioned}, Position: ${serpResult.brandPosition}`);
      
      serp_data = {
        brand_in_serp: serpResult.brandMentioned,
        serp_position: serpResult.brandPosition,
        ai_overview: serpResult.aiOverview,
        top_organic_results: serpResult.organic,
        competitor_serp_positions: serpResult.competitors,
      };

      if (serpResult.brandMentioned) {
        const serpBonus = serpResult.brandPosition 
          ? Math.max(0, 15 - (serpResult.brandPosition * 2))
          : 5;
        overallVisibilityScore = Math.min(100, overallVisibilityScore + serpBonus);
      }
    } else {
      serp_data = {
        brand_in_serp: false,
        serp_position: null,
        ai_overview: `When searching for "${prompt}", consider factors like features, pricing, customer support, and scalability.`,
        top_organic_results: [],
        competitor_serp_positions: [],
      };
    }

    const analysisResult = {
      results: modelResults,
      overall_visibility_score: overallVisibilityScore,
      overall_accuracy: Math.round(avgAccuracy),
      competitors_mentioned: allCompetitorsMentioned,
      recommendations,
      serp_data,
      persona_used: persona,
      data_source: {
        primary: useDataForSEO ? "dataforseo" : "groq_serper",
        dataforseo_balance: dataForSEOBalance,
        dataforseo_available: useDataForSEO,
        models_using_dataforseo: modelResults.filter(r => r.data_source === "dataforseo_llm_scraper").length,
        models_using_fallback: modelResults.filter(r => r.data_source === "groq_simulation").length,
      },
    };

    console.log("Analysis complete:", JSON.stringify({
      visibility: overallVisibilityScore,
      accuracy: Math.round(avgAccuracy),
      mentions: mentionCount,
      persona,
    }));

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in analyze-prompt function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
