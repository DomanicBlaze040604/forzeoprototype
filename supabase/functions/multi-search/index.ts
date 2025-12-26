// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
  source: "google" | "bing" | "searxng";
}

interface PAA {
  question: string;
  answer?: string;
}

interface AggregatedSearchResult {
  organic: SearchResult[];
  paa: PAA[];
  relatedSearches: string[];
  redditThreads: Array<{ title: string; url: string; snippet: string }>;
  quoraThreads: Array<{ title: string; url: string; snippet: string }>;
  newsResults: Array<{ title: string; url: string; snippet: string; date?: string }>;
}

// Serper API (Google) - Free tier: 2,500 queries/month
async function searchSerper(query: string, country: string = "us"): Promise<Partial<AggregatedSearchResult>> {
  const apiKey = Deno.env.get("SERPER_API_KEY");
  if (!apiKey) return { organic: [], paa: [] };

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        gl: country,
        num: 10,
      }),
    });

    if (!response.ok) return { organic: [], paa: [] };

    const data = await response.json();
    
    return {
      organic: (data.organic || []).map((r: any, i: number) => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet,
        position: i + 1,
        source: "google" as const,
      })),
      paa: (data.peopleAlsoAsk || []).map((p: any) => ({
        question: p.question,
        answer: p.snippet,
      })),
      relatedSearches: (data.relatedSearches || []).map((r: any) => r.query),
    };
  } catch (error) {
    console.error("Serper error:", error);
    return { organic: [], paa: [] };
  }
}

// Bing Web Search API - Azure Free Tier: 1,000 transactions/month
async function searchBing(query: string): Promise<Partial<AggregatedSearchResult>> {
  const apiKey = Deno.env.get("BING_API_KEY");
  if (!apiKey) return { organic: [] };

  try {
    const response = await fetch(
      `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=10`,
      {
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
        },
      }
    );

    if (!response.ok) return { organic: [] };

    const data = await response.json();
    
    return {
      organic: (data.webPages?.value || []).map((r: any, i: number) => ({
        title: r.name,
        url: r.url,
        snippet: r.snippet,
        position: i + 1,
        source: "bing" as const,
      })),
      relatedSearches: (data.relatedSearches?.value || []).map((r: any) => r.text),
      newsResults: (data.news?.value || []).map((n: any) => ({
        title: n.name,
        url: n.url,
        snippet: n.description,
        date: n.datePublished,
      })),
    };
  } catch (error) {
    console.error("Bing error:", error);
    return { organic: [] };
  }
}

// SearXNG - Self-hosted, unlimited (fallback)
async function searchSearXNG(query: string): Promise<Partial<AggregatedSearchResult>> {
  const searxngUrl = Deno.env.get("SEARXNG_URL");
  if (!searxngUrl) return { organic: [] };

  try {
    const response = await fetch(
      `${searxngUrl}/search?q=${encodeURIComponent(query)}&format=json&engines=google,bing,duckduckgo`,
      { headers: { "Accept": "application/json" } }
    );

    if (!response.ok) return { organic: [] };

    const data = await response.json();
    
    return {
      organic: (data.results || []).slice(0, 15).map((r: any, i: number) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        position: i + 1,
        source: "searxng" as const,
      })),
    };
  } catch (error) {
    console.error("SearXNG error:", error);
    return { organic: [] };
  }
}

// Search Reddit specifically
async function searchReddit(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const apiKey = Deno.env.get("SERPER_API_KEY");
  if (!apiKey) return [];

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `site:reddit.com ${query}`,
        num: 5,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.organic || []).map((r: any) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    }));
  } catch (error) {
    return [];
  }
}

// Search Quora specifically
async function searchQuora(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const apiKey = Deno.env.get("SERPER_API_KEY");
  if (!apiKey) return [];

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: `site:quora.com ${query}`,
        num: 5,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.organic || []).map((r: any) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    }));
  } catch (error) {
    return [];
  }
}

// Merge and deduplicate results
function mergeResults(
  serper: Partial<AggregatedSearchResult>,
  bing: Partial<AggregatedSearchResult>,
  searxng: Partial<AggregatedSearchResult>,
  reddit: Array<{ title: string; url: string; snippet: string }>,
  quora: Array<{ title: string; url: string; snippet: string }>
): AggregatedSearchResult {
  // Deduplicate organic results by URL
  const seenUrls = new Set<string>();
  const allOrganic: SearchResult[] = [];
  
  // Prioritize: Serper (Google) > Bing > SearXNG
  for (const result of [...(serper.organic || []), ...(bing.organic || []), ...(searxng.organic || [])]) {
    const normalizedUrl = result.url.toLowerCase().replace(/\/$/, "");
    if (!seenUrls.has(normalizedUrl)) {
      seenUrls.add(normalizedUrl);
      allOrganic.push(result);
    }
  }

  // Re-rank by position average
  allOrganic.sort((a, b) => a.position - b.position);

  return {
    organic: allOrganic.slice(0, 15),
    paa: serper.paa || [],
    relatedSearches: [...new Set([...(serper.relatedSearches || []), ...(bing.relatedSearches || [])])],
    redditThreads: reddit,
    quoraThreads: quora,
    newsResults: bing.newsResults || [],
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, country = "us", includeReddit = true, includeQuora = true } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Multi-search for: "${query}" in ${country}`);

    // Run all searches in parallel
    const [serperResults, bingResults, searxngResults, redditResults, quoraResults] = await Promise.all([
      searchSerper(query, country),
      searchBing(query),
      searchSearXNG(query),
      includeReddit ? searchReddit(query) : Promise.resolve([]),
      includeQuora ? searchQuora(query) : Promise.resolve([]),
    ]);

    const merged = mergeResults(serperResults, bingResults, searxngResults, redditResults, quoraResults);

    console.log(`Found ${merged.organic.length} organic, ${merged.paa.length} PAA, ${merged.redditThreads.length} Reddit, ${merged.quoraThreads.length} Quora`);

    return new Response(
      JSON.stringify(merged),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Multi-search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
