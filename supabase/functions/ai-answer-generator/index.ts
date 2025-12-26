// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchContext {
  organic: Array<{ title: string; url: string; snippet: string; position: number }>;
  paa: Array<{ question: string; answer?: string }>;
  redditThreads: Array<{ title: string; url: string; snippet: string }>;
  quoraThreads: Array<{ title: string; url: string; snippet: string }>;
}

interface Citation {
  url: string;
  title: string;
  sentenceIndex: number;
  relevanceScore: number;
}

interface AIAnswer {
  style: "google_sge" | "bing_copilot" | "perplexity";
  answer: string;
  sentences: string[];
  citations: Citation[];
  followUpQuestions: string[];
  keyPoints: string[];
  confidence: number;
}

// Call Gemini 1.5 Flash (Free tier via AI Studio)
async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Call Groq (Llama 3.1 8B - Free tier)
async function callGroq(prompt: string, systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

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

// Generate Google SGE-style answer
function buildSGEPrompt(query: string, context: SearchContext): string {
  const snippets = context.organic.slice(0, 10).map((r, i) => 
    `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`
  ).join("\n\n");

  const paaText = context.paa.slice(0, 5).map(p => 
    `Q: ${p.question}\nA: ${p.answer || "No answer available"}`
  ).join("\n\n");

  const redditText = context.redditThreads.slice(0, 3).map(r =>
    `Reddit: ${r.title}\n${r.snippet}`
  ).join("\n\n");

  return `User Query: "${query}"

TOP SEARCH RESULTS:
${snippets}

PEOPLE ALSO ASK:
${paaText}

COMMUNITY DISCUSSIONS:
${redditText}

Based on the above sources, provide a comprehensive answer.`;
}

const SGE_SYSTEM_PROMPT = `You are Google's AI Overview (SGE). Generate a response that:

1. STRUCTURE:
- Start with a direct, concise answer (2-3 sentences)
- Follow with key points as bullet points
- Include relevant context and nuances
- End with a brief summary if needed

2. CITATIONS:
- Reference sources using [1], [2], etc. inline
- Only cite information that appears in the provided sources
- Cite multiple sources when they agree

3. TONE:
- Neutral and informative
- Avoid promotional language
- Present multiple perspectives when relevant

4. FORMAT YOUR RESPONSE AS JSON:
{
  "answer": "The main answer text with [1] inline citations [2]...",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "followUpQuestions": ["Related question 1?", "Related question 2?", "Related question 3?"],
  "citedSources": [1, 2, 3]
}`;

const BING_COPILOT_SYSTEM_PROMPT = `You are Bing Copilot. Generate a response that:

1. STRUCTURE:
- Conversational but informative tone
- Use bullet points for lists
- Include specific facts and figures
- Provide balanced perspectives

2. CITATIONS:
- Use superscript-style citations like ¹, ², ³
- Cite after each factual claim
- Link citations to source numbers

3. TONE:
- Helpful and friendly
- Slightly more conversational than Google
- Acknowledge uncertainty when appropriate

4. FORMAT YOUR RESPONSE AS JSON:
{
  "answer": "The main answer with citations¹ inline²...",
  "keyPoints": ["Point 1", "Point 2"],
  "followUpQuestions": ["Would you like to know more about X?", "Should I explain Y?"],
  "citedSources": [1, 2]
}`;

const PERPLEXITY_SYSTEM_PROMPT = `You are Perplexity AI. Generate a response that:

1. STRUCTURE:
- Direct and comprehensive
- Well-organized with clear sections
- Include specific data points
- Synthesize information from multiple sources

2. CITATIONS:
- Use numbered citations [1], [2] after statements
- Cite frequently - almost every sentence should have a citation
- Group related citations [1,2,3]

3. TONE:
- Academic and thorough
- Fact-focused
- Minimal opinion

4. FORMAT YOUR RESPONSE AS JSON:
{
  "answer": "Comprehensive answer with frequent [1] citations [2,3]...",
  "keyPoints": ["Key finding 1", "Key finding 2"],
  "followUpQuestions": ["Deeper question 1?", "Related topic?"],
  "citedSources": [1, 2, 3]
}`;

// Parse LLM response and extract structured data
function parseAIResponse(
  rawResponse: string,
  style: AIAnswer["style"],
  context: SearchContext
): AIAnswer {
  let parsed: any = {};
  
  try {
    // Try to extract JSON from response
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback: use raw response as answer
    parsed = { answer: rawResponse, keyPoints: [], followUpQuestions: [], citedSources: [] };
  }

  const answer = parsed.answer || rawResponse;
  const sentences = answer.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim().length > 0);

  // Extract citations from answer text
  const citations: Citation[] = [];
  const citationPattern = /\[(\d+)\]|[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g;
  
  sentences.forEach((sentence: string, sentenceIndex: number) => {
    const matches = sentence.match(citationPattern);
    if (matches) {
      matches.forEach(match => {
        const num = parseInt(match.replace(/[\[\]¹²³⁴⁵⁶⁷⁸⁹⁰]/g, (c) => {
          const superscripts: Record<string, string> = { '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁰': '0' };
          return superscripts[c] || c;
        })) - 1;
        
        if (num >= 0 && num < context.organic.length) {
          const source = context.organic[num];
          citations.push({
            url: source.url,
            title: source.title,
            sentenceIndex,
            relevanceScore: 1 - (num * 0.1), // Higher ranked = more relevant
          });
        }
      });
    }
  });

  // Calculate confidence based on citation coverage
  const citedSentences = new Set(citations.map(c => c.sentenceIndex)).size;
  const confidence = Math.min(100, Math.round((citedSentences / sentences.length) * 100 + 20));

  return {
    style,
    answer,
    sentences,
    citations,
    followUpQuestions: parsed.followUpQuestions || [],
    keyPoints: parsed.keyPoints || [],
    confidence,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      searchContext, 
      styles = ["google_sge", "bing_copilot"],
      preferredModel = "groq"
    } = await req.json();

    if (!query || !searchContext) {
      return new Response(
        JSON.stringify({ error: "Query and searchContext are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating AI answers for: "${query}" using ${preferredModel}`);

    const results: AIAnswer[] = [];
    const prompt = buildSGEPrompt(query, searchContext);

    // Select LLM based on preference and availability (Groq is primary, Gemini is fallback)
    const callLLM = preferredModel === "gemini" ? callGemini : callGroq;

    for (const style of styles) {
      try {
        let systemPrompt: string;
        switch (style) {
          case "bing_copilot":
            systemPrompt = BING_COPILOT_SYSTEM_PROMPT;
            break;
          case "perplexity":
            systemPrompt = PERPLEXITY_SYSTEM_PROMPT;
            break;
          default:
            systemPrompt = SGE_SYSTEM_PROMPT;
        }

        const rawResponse = await callLLM(prompt, systemPrompt);
        const parsed = parseAIResponse(rawResponse, style as AIAnswer["style"], searchContext);
        results.push(parsed);

        console.log(`Generated ${style} answer with ${parsed.citations.length} citations`);
      } catch (error) {
        console.error(`Error generating ${style}:`, error);
        // Try fallback model (Gemini)
        if (preferredModel === "groq") {
          try {
            console.log(`Falling back to Gemini for ${style}`);
            const rawResponse = await callGemini(prompt, SGE_SYSTEM_PROMPT);
            const parsed = parseAIResponse(rawResponse, style as AIAnswer["style"], searchContext);
            results.push(parsed);
          } catch (fallbackError) {
            console.error(`Gemini fallback also failed for ${style}:`, fallbackError);
          }
        } else {
          try {
            console.log(`Falling back to Groq for ${style}`);
            const rawResponse = await callGroq(prompt, SGE_SYSTEM_PROMPT);
            const parsed = parseAIResponse(rawResponse, style as AIAnswer["style"], searchContext);
            results.push(parsed);
          } catch (fallbackError) {
            console.error(`Groq fallback also failed for ${style}:`, fallbackError);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        query,
        answers: results,
        sourcesUsed: searchContext.organic.length,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("AI answer generator error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
