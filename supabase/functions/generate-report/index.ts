// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  reportType: 'visibility' | 'competitor' | 'citation' | 'full';
  brandName: string;
  dateRange?: { start: string; end: string };
  data: {
    visibilityScore?: number;
    totalMentions?: number;
    positiveMentions?: number;
    averageRank?: number;
    prompts?: any[];
    competitors?: any[];
    sources?: any[];
    alerts?: any[];
  };
}

// Clean up text that might contain JSON artifacts
function cleanText(text: string): string {
  if (!text) return "";
  // Remove JSON code blocks
  let cleaned = text.replace(/```json[\s\S]*?```/g, "").replace(/```[\s\S]*?```/g, "");
  // Remove escaped quotes and newlines
  cleaned = cleaned.replace(/\\n/g, "\n").replace(/\\"/g, '"');
  // Remove leading/trailing whitespace
  return cleaned.trim();
}

// Parse metrics ensuring proper format
function parseMetrics(metrics: any[]): Array<{ name: string; value: string; change: string }> {
  if (!Array.isArray(metrics)) return [];
  return metrics.map(m => ({
    name: String(m.name || "Metric"),
    value: String(m.value ?? "N/A"),
    change: String(m.change || "0%"),
  })).filter(m => m.name && m.value);
}

// Parse recommendations ensuring proper format
function parseRecommendations(recs: any[]): Array<{ priority: string; action: string; impact: string }> {
  if (!Array.isArray(recs)) return [];
  return recs.map(r => ({
    priority: ["high", "medium", "low"].includes(r.priority?.toLowerCase()) ? r.priority.toLowerCase() : "medium",
    action: String(r.action || ""),
    impact: String(r.impact || ""),
  })).filter(r => r.action);
}

// Parse competitor insights
function parseCompetitorInsights(insights: any[]): Array<{ name: string; score: number; trend: string }> {
  if (!Array.isArray(insights)) return [];
  return insights.map(c => ({
    name: String(c.name || "Competitor"),
    score: typeof c.score === "number" ? c.score : parseInt(c.score) || 0,
    trend: ["up", "down", "stable"].includes(c.trend?.toLowerCase()) ? c.trend.toLowerCase() : "stable",
  })).filter(c => c.name);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportType, brandName, dateRange, data } = await req.json() as ReportRequest;

    const apiKey = Deno.env.get('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    console.log(`Generating ${reportType} report for ${brandName}`);

    // Build context from provided data
    const visibilityScore = data?.visibilityScore ?? 0;
    const totalMentions = data?.totalMentions ?? 0;
    const positiveMentions = data?.positiveMentions ?? 0;
    const averageRank = data?.averageRank ?? 0;
    const competitorCount = data?.competitors?.length ?? 0;

    const systemPrompt = `You are a professional AI visibility analyst writing a report for ${brandName}.

IMPORTANT: Output ONLY valid JSON, no markdown code blocks, no explanations before or after.

Generate a report with this EXACT structure:
{
  "executiveSummary": "2-3 sentence summary of brand visibility performance",
  "keyMetrics": [
    {"name": "Visibility Score", "value": "75%", "change": "+5%"},
    {"name": "Total Mentions", "value": "150", "change": "+12%"},
    {"name": "Positive Sentiment", "value": "82%", "change": "+3%"},
    {"name": "Average Rank", "value": "#2.5", "change": "-0.5"}
  ],
  "analysis": "Detailed paragraph analyzing the brand's AI visibility performance, trends, and areas of strength/weakness.",
  "competitorInsights": [
    {"name": "Competitor A", "score": 70, "trend": "up"},
    {"name": "Competitor B", "score": 65, "trend": "down"}
  ],
  "recommendations": [
    {"priority": "high", "action": "Specific action to take", "impact": "Expected result"},
    {"priority": "medium", "action": "Another action", "impact": "Expected result"},
    {"priority": "low", "action": "Optional action", "impact": "Expected result"}
  ],
  "predictions": "1-2 sentences about future outlook and trends"
}`;

    const userPrompt = `Create a ${reportType} report for "${brandName}" with this data:
- Current Visibility Score: ${visibilityScore}%
- Total Mentions: ${totalMentions}
- Positive Mentions: ${positiveMentions}
- Average Rank: ${averageRank}
- Competitors tracked: ${competitorCount}
- Date range: ${dateRange ? `${dateRange.start} to ${dateRange.end}` : 'Last 30 days'}

${data?.competitors?.length ? `Competitor data: ${JSON.stringify(data.competitors)}` : ''}

Output ONLY the JSON object, nothing else.`;

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
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let reportData;
    try {
      // Try to extract JSON from response
      let jsonStr = content;
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      // Find JSON object in the string
      const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        jsonStr = objectMatch[0];
      }
      
      const parsed = JSON.parse(jsonStr.trim());
      
      // Validate and clean the parsed data
      reportData = {
        title: `${brandName} ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        generatedAt: new Date().toISOString(),
        executiveSummary: cleanText(parsed.executiveSummary || ""),
        keyMetrics: parseMetrics(parsed.keyMetrics),
        analysis: cleanText(parsed.analysis || ""),
        competitorInsights: parseCompetitorInsights(parsed.competitorInsights),
        recommendations: parseRecommendations(parsed.recommendations),
        predictions: cleanText(parsed.predictions || ""),
      };
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Fallback: create structured report from raw content
      reportData = {
        title: `${brandName} ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        generatedAt: new Date().toISOString(),
        executiveSummary: `${brandName} has a visibility score of ${visibilityScore}% with ${totalMentions} total mentions across AI platforms. ${positiveMentions > totalMentions / 2 ? "Sentiment is predominantly positive." : "There is room for improvement in brand sentiment."}`,
        keyMetrics: [
          { name: "Visibility Score", value: `${visibilityScore}%`, change: "+0%" },
          { name: "Total Mentions", value: String(totalMentions), change: "+0%" },
          { name: "Positive Sentiment", value: totalMentions > 0 ? `${Math.round((positiveMentions / totalMentions) * 100)}%` : "N/A", change: "+0%" },
          { name: "Average Rank", value: averageRank > 0 ? `#${averageRank.toFixed(1)}` : "N/A", change: "0" },
        ],
        analysis: cleanText(content) || `Based on the current data, ${brandName} shows ${visibilityScore > 50 ? "strong" : "moderate"} visibility across AI platforms. The brand appears in ${totalMentions} AI-generated responses with an average ranking of ${averageRank > 0 ? averageRank.toFixed(1) : "N/A"}.`,
        competitorInsights: (data?.competitors || []).slice(0, 5).map((c: any) => ({
          name: c.name || "Competitor",
          score: c.score || c.last_visibility_score || 0,
          trend: "stable",
        })),
        recommendations: [
          { priority: "high", action: "Increase content creation targeting high-intent AI queries", impact: "Improve visibility by 10-15%" },
          { priority: "medium", action: "Monitor competitor strategies and adapt positioning", impact: "Maintain competitive advantage" },
          { priority: "low", action: "Expand tracking to additional AI platforms", impact: "Broader visibility insights" },
        ],
        predictions: `Based on current trends, ${brandName}'s AI visibility is expected to ${visibilityScore > 50 ? "continue growing" : "improve with focused optimization efforts"} over the next quarter.`,
      };
    }

    // Ensure all text fields are clean strings, not JSON
    if (typeof reportData.executiveSummary !== "string" || reportData.executiveSummary.startsWith("{")) {
      reportData.executiveSummary = `${brandName} visibility report generated successfully. Review the metrics and recommendations below for actionable insights.`;
    }
    if (typeof reportData.analysis !== "string" || reportData.analysis.startsWith("{")) {
      reportData.analysis = `${brandName} shows ${visibilityScore > 50 ? "strong" : "moderate"} presence across AI platforms with ${totalMentions} mentions tracked.`;
    }
    if (typeof reportData.predictions !== "string" || reportData.predictions.startsWith("{")) {
      reportData.predictions = `Continued monitoring and optimization recommended for sustained visibility growth.`;
    }

    console.log("Report generated successfully");

    return new Response(
      JSON.stringify(reportData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error generating report:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
