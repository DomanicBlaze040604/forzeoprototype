// @ts-nocheck - Deno types not available in IDE
/**
 * FORZEO MVP Backend - Visibility Score
 * 
 * POST /visibility-score
 * Input: prompt, brand, competitors, rawResponse (optional), parsedEntities (optional)
 * Output: visibility score, mention count, position score, competitors
 * 
 * Scoring Logic (MVP - ChatGPT only):
 * - Mention Score: 40% weight
 * - Answer Coverage: 25% weight  
 * - Position/Rank Prominence: 10% weight
 * - (Remaining 25% reserved for future: sentence-level visibility)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Scoring weights as per MVP requirements
const WEIGHTS = {
  MENTION: 0.40,      // 40% - Brand mentioned in response
  COVERAGE: 0.25,     // 25% - How well brand is covered in answer
  POSITION: 0.10,     // 10% - Position in ranked lists
};

interface VisibilityScoreRequest {
  prompt: string;
  brand: string;
  competitors?: string[];
  rawResponse?: string;
  parsedEntities?: ParsedEntities;
}

interface ParsedEntities {
  brandMentions: BrandMention[];
  competitorMentions: CompetitorMention[];
  orderedLists: OrderedList[];
  citations: Citation[];
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

interface Citation {
  url: string;
  title: string;
  domain: string;
}

interface ScoreBreakdown {
  mentionScore: number;
  coverageScore: number;
  positionScore: number;
  totalScore: number;
}

interface CompetitorSOV {
  name: string;
  mentionCount: number;
  shareOfVoice: number;
  avgPosition: number | null;
  sentiment: "positive" | "neutral" | "negative";
}

interface VisibilityScoreResponse {
  visibilityScore: number;
  scoreBreakdown: ScoreBreakdown;
  mentionCount: number;
  positionInLists: number | null;
  competitors: CompetitorSOV[];
  brandSentiment: "positive" | "neutral" | "negative";
  summary: string;
}

// Calculate Mention Score (40% weight)
function calculateMentionScore(
  brandMentions: BrandMention[],
  responseLength: number
): number {
  if (brandMentions.length === 0) return 0;

  let score = 50; // Base score for being mentioned

  // Frequency bonus (cap at 5 mentions)
  const frequencyBonus = Math.min(brandMentions.length, 5) * 8;
  score += frequencyBonus;

  // Early mention bonus (first 20% of response)
  const firstMentionPosition = brandMentions[0]?.position || responseLength;
  if (firstMentionPosition < responseLength * 0.2) {
    score += 10;
  }

  // Sentiment bonus/penalty
  const sentiments = brandMentions.map(m => m.sentiment);
  const positiveCount = sentiments.filter(s => s === "positive").length;
  const negativeCount = sentiments.filter(s => s === "negative").length;
  
  if (positiveCount > negativeCount) score += 10;
  else if (negativeCount > positiveCount) score -= 10;

  return Math.min(100, Math.max(0, score));
}

// Calculate Coverage Score (25% weight)
function calculateCoverageScore(
  brandMentions: BrandMention[],
  responseLength: number,
  orderedLists: OrderedList[]
): number {
  if (brandMentions.length === 0) return 0;

  let score = 0;

  // Context length analysis
  const totalContextLength = brandMentions.reduce((sum, m) => sum + (m.context?.length || 0), 0);
  const coverageRatio = Math.min(totalContextLength / responseLength, 1);
  score += coverageRatio * 40;

  // List inclusion bonus
  const brandInList = orderedLists.some(list => list.brandPosition !== null);
  if (brandInList) score += 30;

  // Multiple mentions bonus
  if (brandMentions.length >= 2) score += 15;

  // Detailed mention bonus
  const detailedMentions = brandMentions.filter(m => (m.context?.length || 0) > 100);
  if (detailedMentions.length > 0) score += 15;

  return Math.min(100, Math.max(0, score));
}

// Calculate Position Score (10% weight)
function calculatePositionScore(orderedLists: OrderedList[]): number {
  if (orderedLists.length === 0) return 50; // Neutral if no lists

  let bestPosition: number | null = null;

  for (const list of orderedLists) {
    if (list.brandPosition !== null) {
      if (bestPosition === null || list.brandPosition < bestPosition) {
        bestPosition = list.brandPosition;
      }
    }
  }

  if (bestPosition === null) return 0; // Not in any list

  // Score based on position
  const positionScores = [100, 85, 70, 55, 40, 25];
  return positionScores[Math.min(bestPosition - 1, 5)];
}

// Calculate Competitor Share of Voice
function calculateCompetitorSOV(
  competitorMentions: CompetitorMention[],
  brandMentionCount: number,
  orderedLists: OrderedList[]
): CompetitorSOV[] {
  const totalMentions = brandMentionCount + 
    competitorMentions.reduce((sum, c) => sum + c.count, 0);

  if (totalMentions === 0) return [];

  return competitorMentions.map(comp => {
    let positions: number[] = [];
    for (const list of orderedLists) {
      const compPos = list.competitorPositions?.find(
        (cp) => cp.name.toLowerCase() === comp.name.toLowerCase()
      );
      if (compPos) positions.push(compPos.position);
    }

    return {
      name: comp.name,
      mentionCount: comp.count,
      shareOfVoice: Math.round((comp.count / totalMentions) * 100),
      avgPosition: positions.length > 0 
        ? positions.reduce((a, b) => a + b, 0) / positions.length 
        : null,
      sentiment: comp.sentiment || "neutral",
    };
  });
}

// Determine overall brand sentiment
function determineBrandSentiment(brandMentions: BrandMention[]): "positive" | "neutral" | "negative" {
  if (brandMentions.length === 0) return "neutral";

  const sentiments = brandMentions.map(m => m.sentiment);
  const positive = sentiments.filter(s => s === "positive").length;
  const negative = sentiments.filter(s => s === "negative").length;

  if (positive > negative) return "positive";
  if (negative > positive) return "negative";
  return "neutral";
}

// Generate summary
function generateSummary(
  brand: string,
  score: number,
  mentionCount: number,
  positionInLists: number | null,
  competitors: CompetitorSOV[],
  sentiment: string
): string {
  const parts: string[] = [];

  if (score >= 70) {
    parts.push(`${brand} has strong AI visibility (${score}/100).`);
  } else if (score >= 40) {
    parts.push(`${brand} has moderate AI visibility (${score}/100).`);
  } else if (score > 0) {
    parts.push(`${brand} has low AI visibility (${score}/100).`);
  } else {
    parts.push(`${brand} is not mentioned in the AI response.`);
  }

  if (mentionCount > 0) {
    parts.push(`Mentioned ${mentionCount} time${mentionCount > 1 ? 's' : ''}.`);
  }

  if (positionInLists !== null) {
    parts.push(`Ranked #${positionInLists} in recommendations.`);
  }

  if (mentionCount > 0) {
    parts.push(`Overall sentiment: ${sentiment}.`);
  }

  if (competitors.length > 0) {
    const topCompetitor = competitors.sort((a, b) => b.mentionCount - a.mentionCount)[0];
    if (topCompetitor.mentionCount > mentionCount) {
      parts.push(`${topCompetitor.name} leads with ${topCompetitor.shareOfVoice}% share of voice.`);
    }
  }

  return parts.join(' ');
}

// Main scoring function
function calculateVisibilityScore(
  brand: string,
  parsedEntities: ParsedEntities,
  responseLength: number
): VisibilityScoreResponse {
  const { brandMentions, competitorMentions, orderedLists } = parsedEntities;

  const mentionScore = calculateMentionScore(brandMentions, responseLength);
  const coverageScore = calculateCoverageScore(brandMentions, responseLength, orderedLists);
  const positionScore = calculatePositionScore(orderedLists);

  // Calculate weighted total (normalized to 0-100)
  const weightedTotal = 
    (mentionScore * WEIGHTS.MENTION) +
    (coverageScore * WEIGHTS.COVERAGE) +
    (positionScore * WEIGHTS.POSITION);

  // Normalize to 0-100 scale
  const totalScore = Math.round(Math.min(100, weightedTotal / 0.75));

  // Get best position in lists
  let positionInLists: number | null = null;
  for (const list of orderedLists) {
    if (list.brandPosition !== null) {
      if (positionInLists === null || list.brandPosition < positionInLists) {
        positionInLists = list.brandPosition;
      }
    }
  }

  const competitors = calculateCompetitorSOV(competitorMentions, brandMentions.length, orderedLists);
  const brandSentiment = determineBrandSentiment(brandMentions);
  const summary = generateSummary(brand, totalScore, brandMentions.length, positionInLists, competitors, brandSentiment);

  return {
    visibilityScore: totalScore,
    scoreBreakdown: {
      mentionScore: Math.round(mentionScore),
      coverageScore: Math.round(coverageScore),
      positionScore: Math.round(positionScore),
      totalScore: totalScore,
    },
    mentionCount: brandMentions.length,
    positionInLists,
    competitors,
    brandSentiment,
    summary,
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
    let body: VisibilityScoreRequest;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, brand, competitors = [], rawResponse, parsedEntities } = body;

    if (!brand || typeof brand !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "brand is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Require pre-fetched data (rawResponse and parsedEntities)
    if (!rawResponse || !parsedEntities) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "rawResponse and parsedEntities are required. Call execute-prompt first." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[visibility-score] Calculating for brand: ${brand}`);

    const scoreResult = calculateVisibilityScore(brand, parsedEntities, rawResponse.length);

    console.log(`[visibility-score] Score: ${scoreResult.visibilityScore}, Mentions: ${scoreResult.mentionCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: scoreResult,
        metadata: {
          prompt,
          brand,
          competitors,
          responseLength: rawResponse.length,
          timestamp: new Date().toISOString(),
          scoringVersion: "mvp_v1",
          weights: WEIGHTS,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[visibility-score] Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
