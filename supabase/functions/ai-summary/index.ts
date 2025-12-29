// @ts-nocheck - Deno types not available in IDE
/**
 * FORZEO MVP Backend - AI Summary
 * 
 * POST /ai-summary
 * Input: prompt, brand, visibility data
 * Output: AI-generated summary with insights and recommendations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AISummaryRequest {
  prompt: string;
  brand: string;
  competitors?: string[];
  visibilityScore?: number;
  mentionCount?: number;
  positionInLists?: number | null;
  competitorData?: CompetitorData[];
  sentiment?: string;
}

interface CompetitorData {
  name: string;
  mentionCount: number;
  shareOfVoice: number;
  avgPosition?: number | null;
  sentiment?: string;
}

interface AISummaryResponse {
  summary: string;
  keyInsights: string[];
  recommendations: string[];
  competitorComparison: string;
  actionItems: string[];
}

// Generate AI summary using Groq
async function generateAISummary(
  prompt: string,
  brand: string,
  visibilityScore: number,
  mentionCount: number,
  positionInLists: number | null,
  competitorData: CompetitorData[],
  sentiment: string
): Promise<AISummaryResponse> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  
  if (!apiKey) {
    console.log("[ai-summary] No GROQ_API_KEY, using rule-based summary");
    return generateRuleBasedSummary(brand, visibilityScore, mentionCount, positionInLists, competitorData, sentiment);
  }

  try {
    const competitorInfo = competitorData.length > 0
      ? competitorData.map(c => `${c.name}: ${c.mentionCount} mentions, ${c.shareOfVoice}% SOV`).join(", ")
      : "None tracked";

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
            content: `You are an AI visibility analyst. Generate a concise, actionable summary.
Output ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentence executive summary",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "competitorComparison": "1 sentence comparing to competitors",
  "actionItems": ["action1", "action2"]
}
Be specific and actionable. No markdown, just JSON.`
          },
          {
            role: "user",
            content: `Analyze this brand visibility:
Brand: ${brand}
Query: "${prompt}"
Visibility Score: ${visibilityScore}/100
Mentions: ${mentionCount}
Position in Lists: ${positionInLists !== null ? `#${positionInLists}` : "Not listed"}
Sentiment: ${sentiment}
Competitors: ${competitorInfo}

Generate JSON analysis.`
          },
        ],
        temperature: 0.5,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.error("[ai-summary] Groq API error:", response.status);
      return generateRuleBasedSummary(brand, visibilityScore, mentionCount, positionInLists, competitorData, sentiment);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || generateDefaultSummary(brand, visibilityScore, mentionCount),
          keyInsights: Array.isArray(parsed.keyInsights) ? parsed.keyInsights : [],
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
          competitorComparison: parsed.competitorComparison || "",
          actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
        };
      } catch (e) {
        console.error("[ai-summary] JSON parse error:", e);
      }
    }

    return generateRuleBasedSummary(brand, visibilityScore, mentionCount, positionInLists, competitorData, sentiment);

  } catch (error) {
    console.error("[ai-summary] Error:", error);
    return generateRuleBasedSummary(brand, visibilityScore, mentionCount, positionInLists, competitorData, sentiment);
  }
}

function generateDefaultSummary(brand: string, visibilityScore: number, mentionCount: number): string {
  if (visibilityScore >= 70) {
    return `${brand} demonstrates strong AI visibility with a score of ${visibilityScore}/100 and ${mentionCount} mentions. The brand is well-positioned in AI-generated recommendations.`;
  } else if (visibilityScore >= 40) {
    return `${brand} has moderate AI visibility (${visibilityScore}/100) with ${mentionCount} mentions. There's opportunity to improve positioning and increase mention frequency.`;
  } else if (visibilityScore > 0) {
    return `${brand} has limited AI visibility (${visibilityScore}/100) with only ${mentionCount} mentions. Focused content strategy needed to improve AI presence.`;
  } else {
    return `${brand} is not appearing in AI responses for this query. This represents a significant visibility gap that requires immediate attention.`;
  }
}

function generateRuleBasedSummary(
  brand: string,
  visibilityScore: number,
  mentionCount: number,
  positionInLists: number | null,
  competitorData: CompetitorData[],
  sentiment: string
): AISummaryResponse {
  const keyInsights: string[] = [];
  const recommendations: string[] = [];
  const actionItems: string[] = [];

  // Key insights
  if (visibilityScore >= 70) {
    keyInsights.push(`Strong visibility score of ${visibilityScore}/100`);
    keyInsights.push(`Brand mentioned ${mentionCount} times in AI response`);
    if (positionInLists === 1) keyInsights.push("Ranked #1 in AI recommendations");
  } else if (visibilityScore >= 40) {
    keyInsights.push(`Moderate visibility score of ${visibilityScore}/100`);
    keyInsights.push(`${mentionCount} brand mentions detected`);
    if (positionInLists !== null && positionInLists > 3) {
      keyInsights.push(`Ranked #${positionInLists} - room for improvement`);
    }
  } else if (visibilityScore > 0) {
    keyInsights.push(`Low visibility score of ${visibilityScore}/100`);
    keyInsights.push(`Only ${mentionCount} mention(s) found`);
    keyInsights.push("Brand not prominently featured");
  } else {
    keyInsights.push("Brand not mentioned in AI response");
    keyInsights.push("Critical visibility gap identified");
    keyInsights.push("Competitors may be dominating this query");
  }

  if (mentionCount > 0) {
    keyInsights.push(`Overall sentiment: ${sentiment}`);
  }

  // Recommendations
  if (visibilityScore < 70) {
    recommendations.push("Create comprehensive content addressing this query directly");
    recommendations.push("Build authoritative backlinks from industry sources");
    recommendations.push("Encourage customer reviews on major platforms");
  }

  if (positionInLists === null || positionInLists > 3) {
    recommendations.push("Optimize content to appear in AI-generated lists");
    recommendations.push("Include structured data and clear product comparisons");
  }

  if (sentiment === "negative") {
    recommendations.push("Address negative sentiment through improved messaging");
  }

  // Competitor comparison
  let competitorComparison = "";
  if (competitorData.length > 0) {
    const topCompetitor = competitorData.sort((a, b) => b.shareOfVoice - a.shareOfVoice)[0];
    const brandSOV = mentionCount > 0 
      ? Math.round((mentionCount / (mentionCount + competitorData.reduce((s, c) => s + c.mentionCount, 0))) * 100)
      : 0;
    
    if (topCompetitor.shareOfVoice > brandSOV) {
      competitorComparison = `${topCompetitor.name} leads with ${topCompetitor.shareOfVoice}% share of voice vs your ${brandSOV}%.`;
    } else {
      competitorComparison = `${brand} leads competitors with ${brandSOV}% share of voice.`;
    }
  } else {
    competitorComparison = "No competitor data available for comparison.";
  }

  // Action items
  if (visibilityScore < 40) {
    actionItems.push("Audit existing content for AI optimization");
    actionItems.push("Create targeted content for this query");
  }
  if (positionInLists === null) {
    actionItems.push("Develop comparison content to appear in lists");
  }
  if (competitorData.some(c => c.shareOfVoice > 30)) {
    actionItems.push("Analyze top competitor content strategy");
  }

  return {
    summary: generateDefaultSummary(brand, visibilityScore, mentionCount),
    keyInsights,
    recommendations,
    competitorComparison,
    actionItems,
  };
}

// Main handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    let body: AISummaryRequest;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      prompt = "", 
      brand, 
      competitors = [],
      visibilityScore = 0,
      mentionCount = 0,
      positionInLists = null,
      competitorData = [],
      sentiment = "neutral"
    } = body;

    if (!brand || typeof brand !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "brand is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-summary] Generating summary for brand: ${brand}, score: ${visibilityScore}`);

    const summaryResult = await generateAISummary(
      prompt,
      brand,
      visibilityScore,
      mentionCount,
      positionInLists,
      competitorData,
      sentiment
    );

    console.log(`[ai-summary] Generated summary with ${summaryResult.keyInsights.length} insights`);

    return new Response(
      JSON.stringify({
        success: true,
        data: summaryResult,
        metadata: {
          prompt,
          brand,
          visibilityScore,
          timestamp: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ai-summary] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
