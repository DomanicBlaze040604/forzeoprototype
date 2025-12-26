// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MentionResult {
  brand: string;
  mentioned: boolean;
  mentionCount: number;
  positions: number[];
  contexts: Array<{
    sentence: string;
    sentenceIndex: number;
    position: "beginning" | "middle" | "end";
    prominence: number;
  }>;
  sentiment: "positive" | "neutral" | "negative";
  sentimentScore: number;
  competitors: Array<{
    name: string;
    mentioned: boolean;
    mentionCount: number;
  }>;
  citationFrequency: number;
  overallScore: number;
}

// Sentiment lexicon for rule-based analysis
const SENTIMENT_LEXICON = {
  positive: [
    "best", "excellent", "great", "amazing", "outstanding", "superior", "leading",
    "top", "recommended", "trusted", "reliable", "innovative", "powerful", "efficient",
    "popular", "favorite", "preferred", "award", "winning", "success", "effective"
  ],
  negative: [
    "worst", "bad", "poor", "terrible", "awful", "inferior", "lacking", "weak",
    "outdated", "expensive", "overpriced", "complicated", "difficult", "slow",
    "unreliable", "buggy", "limited", "disappointing", "frustrating", "avoid"
  ],
};

// Calculate sentiment score from text
function analyzeSentiment(text: string, brand: string): { sentiment: "positive" | "neutral" | "negative"; score: number } {
  const textLower = text.toLowerCase();
  const brandLower = brand.toLowerCase();
  
  // Find sentences containing the brand
  const sentences = text.split(/[.!?]+/).filter(s => s.toLowerCase().includes(brandLower));
  
  if (sentences.length === 0) {
    return { sentiment: "neutral", score: 0 };
  }
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase();
    for (const word of SENTIMENT_LEXICON.positive) {
      if (sentenceLower.includes(word)) positiveCount++;
    }
    for (const word of SENTIMENT_LEXICON.negative) {
      if (sentenceLower.includes(word)) negativeCount++;
    }
  }
  
  const score = (positiveCount - negativeCount) / Math.max(1, positiveCount + negativeCount);
  
  if (score > 0.2) return { sentiment: "positive", score };
  if (score < -0.2) return { sentiment: "negative", score };
  return { sentiment: "neutral", score };
}

// Detect brand mentions with context
function detectMentions(
  text: string,
  brand: string,
  brandAliases: string[] = []
): Omit<MentionResult, "competitors" | "citationFrequency" | "overallScore"> {
  const allBrandTerms = [brand, ...brandAliases].map(b => b.toLowerCase());
  const sentences = text.split(/(?<=[.!?])\s+/);
  const textLower = text.toLowerCase();
  
  const positions: number[] = [];
  const contexts: MentionResult["contexts"] = [];
  
  // Find all mention positions
  for (const term of allBrandTerms) {
    let pos = 0;
    while ((pos = textLower.indexOf(term, pos)) !== -1) {
      positions.push(pos);
      pos += term.length;
    }
  }
  
  // Analyze each sentence for context
  sentences.forEach((sentence, sentenceIndex) => {
    const sentenceLower = sentence.toLowerCase();
    const hasMention = allBrandTerms.some(term => sentenceLower.includes(term));
    
    if (hasMention) {
      // Determine position within sentence
      const sentenceStart = textLower.indexOf(sentenceLower);
      const mentionPos = allBrandTerms.reduce((min, term) => {
        const pos = sentenceLower.indexOf(term);
        return pos !== -1 && pos < min ? pos : min;
      }, Infinity);
      
      const relativePos = mentionPos / sentence.length;
      let position: "beginning" | "middle" | "end";
      if (relativePos < 0.33) position = "beginning";
      else if (relativePos < 0.66) position = "middle";
      else position = "end";
      
      // Calculate prominence (beginning = higher prominence)
      const prominence = position === "beginning" ? 1.0 : position === "middle" ? 0.7 : 0.5;
      
      contexts.push({
        sentence: sentence.trim(),
        sentenceIndex,
        position,
        prominence,
      });
    }
  });
  
  const { sentiment, score: sentimentScore } = analyzeSentiment(text, brand);
  
  return {
    brand,
    mentioned: positions.length > 0,
    mentionCount: positions.length,
    positions,
    contexts,
    sentiment,
    sentimentScore,
  };
}

// Detect competitor mentions
function detectCompetitors(
  text: string,
  competitors: Array<{ name: string; aliases?: string[] }>
): MentionResult["competitors"] {
  return competitors.map(comp => {
    const allTerms = [comp.name, ...(comp.aliases || [])].map(t => t.toLowerCase());
    const textLower = text.toLowerCase();
    
    let mentionCount = 0;
    for (const term of allTerms) {
      let pos = 0;
      while ((pos = textLower.indexOf(term, pos)) !== -1) {
        mentionCount++;
        pos += term.length;
      }
    }
    
    return {
      name: comp.name,
      mentioned: mentionCount > 0,
      mentionCount,
    };
  });
}

// Calculate citation frequency from URLs
function calculateCitationFrequency(
  citations: Array<{ url: string }>,
  brandDomains: string[]
): number {
  if (citations.length === 0) return 0;
  
  const brandCitations = citations.filter(c => 
    brandDomains.some(domain => c.url.toLowerCase().includes(domain.toLowerCase()))
  );
  
  return brandCitations.length / citations.length;
}

// Calculate overall mention score
function calculateOverallScore(
  mentionResult: Omit<MentionResult, "overallScore">,
  weights: { mention: number; prominence: number; sentiment: number; citation: number }
): number {
  const { mention = 0.3, prominence = 0.25, sentiment = 0.25, citation = 0.2 } = weights;
  
  // Mention score (0-100)
  const mentionScore = mentionResult.mentioned ? Math.min(100, mentionResult.mentionCount * 20) : 0;
  
  // Prominence score (0-100)
  const avgProminence = mentionResult.contexts.length > 0
    ? mentionResult.contexts.reduce((sum, c) => sum + c.prominence, 0) / mentionResult.contexts.length
    : 0;
  const prominenceScore = avgProminence * 100;
  
  // Sentiment score (0-100, neutral = 50)
  const sentimentScore = (mentionResult.sentimentScore + 1) * 50;
  
  // Citation score (0-100)
  const citationScore = mentionResult.citationFrequency * 100;
  
  return Math.round(
    mentionScore * mention +
    prominenceScore * prominence +
    sentimentScore * sentiment +
    citationScore * citation
  );
}

// LLM-enhanced mention detection for complex cases
async function enhancedMentionDetection(
  text: string,
  brand: string,
  competitors: string[]
): Promise<{ brandMentioned: boolean; competitorsMentioned: string[]; reasoning: string } | null> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) return null;
  
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
            content: `Analyze the text for brand mentions. Output JSON only:
{"brandMentioned": boolean, "competitorsMentioned": ["name1"], "reasoning": "brief explanation"}`
          },
          {
            role: "user",
            content: `Brand: ${brand}\nCompetitors: ${competitors.join(", ")}\n\nText:\n${text.slice(0, 2000)}`
          }
        ],
        temperature: 0.1,
        max_tokens: 200,
      }),
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("LLM mention detection error:", error);
  }
  
  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      text,
      brand,
      brandAliases = [],
      brandDomains = [],
      competitors = [],
      citations = [],
      useEnhancedDetection = false,
      scoringWeights,
    } = await req.json();

    if (!text || !brand) {
      return new Response(
        JSON.stringify({ error: "text and brand are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Detecting mentions for brand: ${brand}`);

    // Basic mention detection
    const mentionResult = detectMentions(text, brand, brandAliases);
    
    // Competitor detection
    const competitorResults = detectCompetitors(text, competitors);
    
    // Citation frequency
    const citationFrequency = calculateCitationFrequency(citations, brandDomains);
    
    // Enhanced detection with LLM (optional)
    let enhancedResult = null;
    if (useEnhancedDetection && !mentionResult.mentioned) {
      enhancedResult = await enhancedMentionDetection(
        text,
        brand,
        competitors.map((c: any) => c.name)
      );
      
      // Update mention result if LLM found something we missed
      if (enhancedResult?.brandMentioned && !mentionResult.mentioned) {
        mentionResult.mentioned = true;
        mentionResult.mentionCount = 1;
        mentionResult.contexts.push({
          sentence: enhancedResult.reasoning,
          sentenceIndex: -1,
          position: "middle",
          prominence: 0.5,
        });
      }
    }
    
    // Calculate overall score
    const fullResult: MentionResult = {
      ...mentionResult,
      competitors: competitorResults,
      citationFrequency,
      overallScore: 0,
    };
    
    fullResult.overallScore = calculateOverallScore(
      fullResult,
      scoringWeights || { mention: 0.3, prominence: 0.25, sentiment: 0.25, citation: 0.2 }
    );

    return new Response(
      JSON.stringify({
        result: fullResult,
        enhancedDetection: enhancedResult,
        analyzedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mention detector error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
