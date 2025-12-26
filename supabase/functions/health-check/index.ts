// @ts-nocheck - Deno types not available in IDE
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { service } = await req.json();
    const results: Record<string, boolean> = {};

    // Ping check - just return success if edge function is running
    if (service === "ping" || !service) {
      return new Response(
        JSON.stringify({ ok: true, timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check Groq API
    if (service === "ai-gateway" || service === "groq" || service === "all") {
      const apiKey = Deno.env.get('GROQ_API_KEY');
      if (apiKey) {
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [{ role: "user", content: "Hi" }],
              max_tokens: 5,
            }),
          });
          results.groq = response.ok;
        } catch {
          results.groq = false;
        }
      } else {
        results.groq = false;
      }
    }

    // Check Serper API
    if (service === "serper" || service === "all") {
      const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
      if (SERPER_API_KEY) {
        try {
          // Just check if we can reach the API with a minimal request
          const response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
              "X-API-KEY": SERPER_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              q: "test",
              num: 1,
            }),
          });
          results.serper = response.ok;
        } catch {
          results.serper = false;
        }
      } else {
        results.serper = false;
      }
    }

    console.log("Health check results:", results);

    return new Response(
      JSON.stringify({ ...results, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
