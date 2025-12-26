// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Intent = "informational" | "commercial" | "transactional" | "navigational";
type Funnel = "tofu" | "mofu" | "bofu";

interface ClassificationResult {
  intent: Intent;
  funnel: Funnel;
  topicCluster: string;
  confidence: number;
  reasoning: string;
  keywords: string[];
  brandSignals: string[];
}

// Intent classification patterns (rule-based fallback)
const INTENT_PATTERNS: Record<Intent, RegExp[]> = {
  informational: [
    /^(what|how|why|when|where|who|which|can|does|is|are|do)\b/i,
    /\b(guide|tutorial|learn|understand|explain|definition|meaning)\b/i,
    /\b(vs|versus|comparison|difference|compare)\b/i,
  ],
  commercial: [
    /\b(best|top|review|reviews|rating|ratings|recommended)\b/i,
    /\b(alternative|alternatives|like|similar to)\b/i,
    /\b(pros and cons|advantages|disadvantages)\b/i,
    /\b(for small business|for enterprise|for startups)\b/i,
  ],
  transactional: [
    /\b(buy|purchase|order|price|pricing|cost|discount|deal|coupon)\b/i,
    /\b(free trial|demo|sign up|subscribe|download)\b/i,
    /\b(cheap|affordable|budget)\b/i,
  ],
  navigational: [
    /\b(login|sign in|official|website|homepage|support|contact)\b/i,
    /\b(\.com|\.io|\.ai|\.org)\b/i,
  ],
};

// Funnel stage patterns
const FUNNEL_PATTERNS: Record<Funnel, RegExp[]> = {
  tofu: [
    /^(what is|how does|why|introduction to|basics of|beginner)\b/i,
    /\b(learn|understand|overview|guide|101)\b/i,
  ],
  mofu: [
    /\b(best|top|compare|vs|versus|alternative|review)\b/i,
    /\b(features|benefits|use cases|examples)\b/i,
    /\b(for \w+|solution for)\b/i,
  ],
  bofu: [
    /\b(pricing|cost|buy|purchase|trial|demo|implementation)\b/i,
    /\b(discount|coupon|deal|offer)\b/i,
    /\b(how to use|setup|integrate|migration)\b/i,
  ],
};

// Rule-based classification (fast, no API needed)
function classifyWithRules(prompt: string): Partial<ClassificationResult> {
  const promptLower = prompt.toLowerCase();
  
  // Classify intent
  let intent: Intent = "informational";
  let maxIntentMatches = 0;
  
  for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
    const matches = patterns.filter(p => p.test(promptLower)).length;
    if (matches > maxIntentMatches) {
      maxIntentMatches = matches;
      intent = intentType as Intent;
    }
  }

  // Classify funnel
  let funnel: Funnel = "tofu";
  let maxFunnelMatches = 0;
  
  for (const [funnelStage, patterns] of Object.entries(FUNNEL_PATTERNS)) {
    const matches = patterns.filter(p => p.test(promptLower)).length;
    if (matches > maxFunnelMatches) {
      maxFunnelMatches = matches;
      funnel = funnelStage as Funnel;
    }
  }

  // Extract keywords
  const keywords = promptLower
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 3)
    .filter(w => !["what", "how", "best", "the", "for", "and", "with"].includes(w));

  return {
    intent,
    funnel,
    keywords: [...new Set(keywords)].slice(0, 10),
    confidence: Math.min(100, 50 + maxIntentMatches * 15 + maxFunnelMatches * 15),
  };
}

// LLM-based classification (more accurate)
async function classifyWithLLM(prompt: string): Promise<ClassificationResult> {
  const apiKey = Deno.env.get("GROQ_API_KEY") || Deno.env.get("GEMINI_API_KEY");
  
  if (!apiKey) {
    // Fallback to rule-based
    const ruleResult = classifyWithRules(prompt);
    return {
      ...ruleResult,
      topicCluster: extractTopicCluster(prompt),
      reasoning: "Classified using rule-based patterns (no LLM API configured)",
      brandSignals: extractBrandSignals(prompt),
    } as ClassificationResult;
  }

  const systemPrompt = `You are a search intent classifier. Analyze the user's search query and classify it.

OUTPUT FORMAT (JSON only, no markdown):
{
  "intent": "informational" | "commercial" | "transactional" | "navigational",
  "funnel": "tofu" | "mofu" | "bofu",
  "topicCluster": "string - the main topic category",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "keywords": ["key", "words"],
  "brandSignals": ["any brand names or product mentions"]
}

DEFINITIONS:
- Intent:
  - informational: seeking knowledge/answers
  - commercial: researching before purchase
  - transactional: ready to buy/act
  - navigational: looking for specific site/page

- Funnel:
  - tofu (Top of Funnel): awareness stage, learning
  - mofu (Middle of Funnel): consideration, comparing options
  - bofu (Bottom of Funnel): decision, ready to convert`;

  try {
    let response;
    
    if (Deno.env.get("GROQ_API_KEY")) {
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Classify this search query: "${prompt}"` },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });
    } else {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ 
              role: "user", 
              parts: [{ text: `${systemPrompt}\n\nClassify this search query: "${prompt}"` }] 
            }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
          }),
        }
      );
    }

    if (!response.ok) {
      throw new Error("LLM API error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 
                    data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        intent: parsed.intent || "informational",
        funnel: parsed.funnel || "tofu",
        topicCluster: parsed.topicCluster || extractTopicCluster(prompt),
        confidence: parsed.confidence || 80,
        reasoning: parsed.reasoning || "LLM classification",
        keywords: parsed.keywords || [],
        brandSignals: parsed.brandSignals || [],
      };
    }

    throw new Error("Could not parse LLM response");
  } catch (error) {
    console.error("LLM classification error:", error);
    // Fallback to rule-based
    const ruleResult = classifyWithRules(prompt);
    return {
      ...ruleResult,
      topicCluster: extractTopicCluster(prompt),
      reasoning: "Fallback to rule-based classification",
      brandSignals: extractBrandSignals(prompt),
    } as ClassificationResult;
  }
}

// Extract topic cluster from prompt
function extractTopicCluster(prompt: string): string {
  const promptLower = prompt.toLowerCase();
  
  const topicPatterns: Record<string, RegExp[]> = {
    "CRM Software": [/\bcrm\b/, /\bcustomer relationship\b/, /\bsalesforce\b/, /\bhubspot\b/],
    "Marketing Automation": [/\bmarketing automation\b/, /\bemail marketing\b/, /\bmailchimp\b/],
    "SEO Tools": [/\bseo\b/, /\bsearch engine\b/, /\bkeyword\b/, /\bbacklink\b/],
    "AI Tools": [/\bai\b/, /\bartificial intelligence\b/, /\bmachine learning\b/, /\bchatgpt\b/],
    "Project Management": [/\bproject management\b/, /\btask\b/, /\basana\b/, /\btrello\b/],
    "Analytics": [/\banalytics\b/, /\bdata\b/, /\breporting\b/, /\bdashboard\b/],
    "E-commerce": [/\becommerce\b/, /\be-commerce\b/, /\bshopify\b/, /\bonline store\b/],
    "Cloud Services": [/\bcloud\b/, /\baws\b/, /\bazure\b/, /\bhosting\b/],
    "Cybersecurity": [/\bsecurity\b/, /\bcyber\b/, /\bvpn\b/, /\bantivirus\b/],
    "HR Software": [/\bhr\b/, /\bhuman resources\b/, /\bpayroll\b/, /\brecruiting\b/],
  };

  for (const [topic, patterns] of Object.entries(topicPatterns)) {
    if (patterns.some(p => p.test(promptLower))) {
      return topic;
    }
  }

  // Extract main noun phrase as topic
  const words = prompt.split(/\s+/).filter(w => w.length > 3);
  return words.slice(0, 3).join(" ") || "General";
}

// Extract brand signals from prompt
function extractBrandSignals(prompt: string): string[] {
  const knownBrands = [
    "salesforce", "hubspot", "zoho", "pipedrive", "monday", "asana", "trello",
    "slack", "notion", "airtable", "mailchimp", "sendgrid", "twilio",
    "stripe", "shopify", "woocommerce", "magento", "bigcommerce",
    "aws", "azure", "google cloud", "digitalocean", "vercel", "netlify",
    "semrush", "ahrefs", "moz", "screaming frog", "surfer seo",
    "chatgpt", "claude", "gemini", "perplexity", "jasper", "copy.ai",
  ];

  const promptLower = prompt.toLowerCase();
  return knownBrands.filter(brand => promptLower.includes(brand));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompts, useLLM = true } = await req.json();

    if (!prompts || !Array.isArray(prompts)) {
      return new Response(
        JSON.stringify({ error: "prompts array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Classifying ${prompts.length} prompts, useLLM: ${useLLM}`);

    const results: Array<{ prompt: string; classification: ClassificationResult }> = [];

    for (const prompt of prompts) {
      const classification = useLLM 
        ? await classifyWithLLM(prompt)
        : {
            ...classifyWithRules(prompt),
            topicCluster: extractTopicCluster(prompt),
            reasoning: "Rule-based classification",
            brandSignals: extractBrandSignals(prompt),
          } as ClassificationResult;

      results.push({ prompt, classification });
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Prompt classifier error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
