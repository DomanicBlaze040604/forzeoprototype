/**
 * Forzeo Client Dashboard Hook - Full Featured
 * 
 * Features:
 * - Full client management (add/edit/delete)
 * - Unlimited prompts
 * - Multi-format import (JSON, CSV, TXT)
 * - Cost tracking per search
 * - LocalStorage persistence
 * - LLM Mentions API for AI visibility tracking
 * 
 * "Forzeo does not query LLMs. It monitors how LLMs already talk about you."
 */

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Available AI models - Individual LLM names + SERP models
export const AI_MODELS = [
  // LLM Models (via DataForSEO LLM Mentions API)
  { id: "chatgpt", name: "ChatGPT", provider: "OpenAI", color: "#10a37f", costPerQuery: 0.02, isLLM: true },
  { id: "claude", name: "Claude", provider: "Anthropic", color: "#d97706", costPerQuery: 0.02, isLLM: true },
  { id: "gemini", name: "Gemini", provider: "Google", color: "#4285f4", costPerQuery: 0.02, isLLM: true },
  { id: "perplexity", name: "Perplexity", provider: "Perplexity AI", color: "#6366f1", costPerQuery: 0.02, isLLM: true },
  // Traditional SERP Models
  { id: "google_ai_overview", name: "Google AI Overview", provider: "DataForSEO", color: "#ea4335", costPerQuery: 0.003, isLLM: false },
  { id: "google_serp", name: "Google SERP", provider: "DataForSEO", color: "#34a853", costPerQuery: 0.002, isLLM: false },
];

// Industry presets
export const INDUSTRY_PRESETS: { [key: string]: { competitors: string[]; prompts: string[] } } = {
  "Dating/Matrimony": {
    competitors: ["Bumble", "Hinge", "Tinder", "Shaadi", "Aisle", "OkCupid"],
    prompts: ["Best dating apps in {region} 2025", "Dating apps with ID verification", "Alternatives to Tinder for serious relationships"]
  },
  "Food/Beverage": {
    competitors: ["Sysco", "US Foods", "Makro", "Metro", "CP Foods"],
    prompts: ["Best food distributors in {region}", "Premium beverage suppliers", "Top FMCG companies {region}"]
  },
  "Healthcare/Dental": {
    competitors: ["Bupa Dental", "MyDentist", "Dental Care", "Smile Direct"],
    prompts: ["Best dental clinic in {region}", "Top dentists near me", "Emergency dentist {region}"]
  },
  "E-commerce/Fashion": {
    competitors: ["Myntra", "Ajio", "Amazon Fashion", "Meesho", "Nykaa"],
    prompts: ["Best online fashion stores {region}", "Affordable trendy clothing", "Top e-commerce fashion brands"]
  },
  "Technology/SaaS": {
    competitors: ["Salesforce", "HubSpot", "Zendesk", "Freshworks"],
    prompts: ["Best CRM software 2025", "Top SaaS tools for startups", "Alternatives to {competitor}"]
  },
  "Travel/Hospitality": {
    competitors: ["Booking.com", "Airbnb", "Expedia", "MakeMyTrip"],
    prompts: ["Best hotels in {region}", "Top travel booking sites", "Cheap flights to {region}"]
  },
  "Custom": {
    competitors: [],
    prompts: []
  }
};

export interface Client {
  id: string;
  name: string;
  brand_name: string;
  brand_domain?: string;  // Domain for LLM Mentions API (e.g., "juleo.club")
  brand_tags: string[];
  slug: string;
  target_region: string;
  location_code: number;
  location_name?: string;  // For LLM Mentions API (e.g., "India")
  industry: string;
  competitors: string[];
  logo_url?: string;
  primary_color: string;
  created_at: string;
  is_default?: boolean;
}

export interface Prompt {
  id: string;
  client_id: string;
  prompt_text: string;
  category: string;
  is_custom: boolean;
  is_active: boolean;
}

export interface ModelResult {
  model: string;
  model_name: string;
  provider: string;
  color?: string;
  success: boolean;
  error?: string;
  raw_response: string;
  response_length: number;
  brand_mentioned: boolean;
  brand_mention_count: number;
  brand_rank: number | null;
  brand_sentiment: string;
  matched_terms: string[];
  winner_brand: string;
  competitors_found: Array<{ name: string; count: number; rank: number | null; sentiment: string }>;
  citations: Array<{ url: string; title: string; domain: string; position?: number; snippet?: string }>;
  citation_count: number;
  api_cost: number;
}

export interface AuditResult {
  id: string;
  prompt_id: string;
  prompt_text: string;
  model_results: ModelResult[];
  summary: {
    share_of_voice: number;
    average_rank: number | null;
    total_models_checked: number;
    visible_in: number;
    total_citations: number;
    total_cost: number;
  };
  top_sources: Array<{ domain: string; count: number; url?: string; title?: string }>;
  top_competitors: Array<{ name: string; total_mentions: number; avg_rank: number | null }>;
  created_at: string;
}

export interface DashboardSummary {
  total_prompts: number;
  overall_sov: number;
  average_rank: number | null;
  total_citations: number;
  total_cost: number;
  top_sources: Array<{ domain: string; count: number }>;
  top_competitors: Array<{ name: string; total_mentions: number; avg_rank: number | null }>;
  visibility_by_model: { [model: string]: { visible: number; total: number; cost: number } };
}

export interface SourceSummary {
  domain: string;
  full_urls: string[];
  total_count: number;
  prompts: string[];
}

export interface CostBreakdown {
  total: number;
  by_model: { [model: string]: number };
  by_prompt: { [prompt: string]: number };
}

// Location codes for common regions
export const LOCATION_CODES: { [key: string]: number } = {
  "India": 2356,
  "United States": 2840,
  "United Kingdom": 2826,
  "Thailand": 2764,
  "Singapore": 2702,
  "Australia": 2036,
  "Canada": 2124,
  "Germany": 2276,
  "France": 2250,
  "Japan": 2392,
};

// LocalStorage keys
const STORAGE_KEYS = {
  RESULTS: "forzeo_audit_results_v2",
  CLIENTS: "forzeo_clients_v2",
  PROMPTS: "forzeo_prompts_v2",
  SELECTED_CLIENT: "forzeo_selected_client",
  SELECTED_MODELS: "forzeo_selected_models",
};

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch { return defaultValue; }
}

function saveToStorage(key: string, value: any): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { console.error("Storage error:", err); }
}

// Generate slug from name
function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Generate random color
function generateColor(): string {
  const colors = ["#ec4899", "#f59e0b", "#06b6d4", "#8b5cf6", "#10b981", "#ef4444", "#3b82f6", "#f97316"];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function useClientDashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sourceSummary, setSourceSummary] = useState<SourceSummary[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown>({ total: 0, by_model: {}, by_prompt: {} });
  const [selectedModels, setSelectedModelsState] = useState<string[]>(
    loadFromStorage(STORAGE_KEYS.SELECTED_MODELS, ["chatgpt", "claude", "gemini", "perplexity", "google_ai_overview"])
  );
  const [loading, setLoading] = useState(false);
  const [loadingPromptId, setLoadingPromptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Persist selected models
  const setSelectedModels = useCallback((models: string[]) => {
    setSelectedModelsState(models);
    saveToStorage(STORAGE_KEYS.SELECTED_MODELS, models);
  }, []);

  // Initialize clients
  const fetchClients = useCallback(async () => {
    const storedClients = loadFromStorage<Client[]>(STORAGE_KEYS.CLIENTS, []);
    
    // Default clients if none exist
    if (storedClients.length === 0) {
      const defaultClients: Client[] = [
        { 
          id: "1", name: "Juleo Club", brand_name: "Juleo", brand_domain: "juleo.club", slug: "juleo", 
          target_region: "India", location_code: 2356, location_name: "India", industry: "Dating/Matrimony", 
          primary_color: "#ec4899", created_at: new Date().toISOString(), is_default: true,
          brand_tags: ["Juleo Club", "Trusted Singles Club", "juleo.club"],
          competitors: ["Bumble", "Hinge", "Tinder", "Shaadi", "Aisle", "OkCupid"]
        },
        { 
          id: "2", name: "Jagota", brand_name: "Jagota", brand_domain: "jagota.com", slug: "jagota", 
          target_region: "Thailand", location_code: 2764, location_name: "Thailand", industry: "Food/Beverage", 
          primary_color: "#f59e0b", created_at: new Date().toISOString(), is_default: true,
          brand_tags: ["Jagota Brothers", "Jagota Group"],
          competitors: ["Sysco", "US Foods", "Makro", "Metro", "CP Foods"]
        },
        { 
          id: "3", name: "Post House Dental", brand_name: "Post House Dental", brand_domain: "posthousedental.co.uk", slug: "post-house-dental", 
          target_region: "Surrey, UK", location_code: 2826, location_name: "United Kingdom", industry: "Healthcare/Dental", 
          primary_color: "#06b6d4", created_at: new Date().toISOString(), is_default: true,
          brand_tags: ["Post House", "PHD Surrey"],
          competitors: ["Bupa Dental", "MyDentist", "Dental Care", "Smile Direct"]
        },
        { 
          id: "4", name: "Shoptheyn", brand_name: "Shoptheyn", brand_domain: "shoptheyn.com", slug: "shoptheyn", 
          target_region: "India", location_code: 2356, location_name: "India", industry: "E-commerce/Fashion", 
          primary_color: "#8b5cf6", created_at: new Date().toISOString(), is_default: true,
          brand_tags: ["Shop Theyn", "Theyn Fashion"],
          competitors: ["Myntra", "Ajio", "Amazon Fashion", "Meesho", "Nykaa"]
        },
      ];
      setClients(defaultClients);
      saveToStorage(STORAGE_KEYS.CLIENTS, defaultClients);
      
      const lastSelectedId = loadFromStorage<string>(STORAGE_KEYS.SELECTED_CLIENT, "1");
      const lastSelected = defaultClients.find(c => c.id === lastSelectedId) || defaultClients[0];
      setSelectedClient(lastSelected);
    } else {
      setClients(storedClients);
      const lastSelectedId = loadFromStorage<string>(STORAGE_KEYS.SELECTED_CLIENT, storedClients[0]?.id);
      const lastSelected = storedClients.find(c => c.id === lastSelectedId) || storedClients[0];
      setSelectedClient(lastSelected);
    }
  }, []);

  // Add new client
  const addClient = useCallback((clientData: Partial<Client>): Client => {
    const newClient: Client = {
      id: crypto.randomUUID(),
      name: clientData.name || "New Client",
      brand_name: clientData.brand_name || clientData.name || "New Brand",
      slug: generateSlug(clientData.name || "new-client"),
      target_region: clientData.target_region || "United States",
      location_code: clientData.location_code || LOCATION_CODES[clientData.target_region || "United States"] || 2840,
      industry: clientData.industry || "Custom",
      primary_color: clientData.primary_color || generateColor(),
      created_at: new Date().toISOString(),
      brand_tags: clientData.brand_tags || [],
      competitors: clientData.competitors || INDUSTRY_PRESETS[clientData.industry || "Custom"]?.competitors || [],
      is_default: false,
    };
    
    const newClients = [...clients, newClient];
    setClients(newClients);
    saveToStorage(STORAGE_KEYS.CLIENTS, newClients);
    
    // Add default prompts for the industry
    const industryPrompts = INDUSTRY_PRESETS[newClient.industry]?.prompts || [];
    if (industryPrompts.length > 0) {
      const newPrompts: Prompt[] = industryPrompts.map((text, idx) => ({
        id: `${newClient.id}-${idx}`,
        client_id: newClient.id,
        prompt_text: text.replace("{region}", newClient.target_region).replace("{competitor}", newClient.competitors[0] || "competitor"),
        category: "default",
        is_custom: false,
        is_active: true,
      }));
      const storedPrompts = loadFromStorage<{ [key: string]: Prompt[] }>(STORAGE_KEYS.PROMPTS, {});
      storedPrompts[newClient.id] = newPrompts;
      saveToStorage(STORAGE_KEYS.PROMPTS, storedPrompts);
    }
    
    return newClient;
  }, [clients]);

  // Update client
  const updateClient = useCallback((clientId: string, updates: Partial<Client>) => {
    const newClients = clients.map(c => c.id === clientId ? { ...c, ...updates } : c);
    setClients(newClients);
    saveToStorage(STORAGE_KEYS.CLIENTS, newClients);
    
    if (selectedClient?.id === clientId) {
      setSelectedClient({ ...selectedClient, ...updates });
    }
  }, [clients, selectedClient]);

  // Delete client
  const deleteClient = useCallback((clientId: string) => {
    // Must keep at least one client
    if (clients.length <= 1) {
      setError("Cannot delete the last client. Add another client first.");
      return false;
    }
    
    const newClients = clients.filter(c => c.id !== clientId);
    setClients(newClients);
    saveToStorage(STORAGE_KEYS.CLIENTS, newClients);
    
    // Clean up prompts and results
    const storedPrompts = loadFromStorage<{ [key: string]: Prompt[] }>(STORAGE_KEYS.PROMPTS, {});
    delete storedPrompts[clientId];
    saveToStorage(STORAGE_KEYS.PROMPTS, storedPrompts);
    
    const storedResults = loadFromStorage<{ [key: string]: AuditResult[] }>(STORAGE_KEYS.RESULTS, {});
    delete storedResults[clientId];
    saveToStorage(STORAGE_KEYS.RESULTS, storedResults);
    
    // Switch to another client if this was selected
    if (selectedClient?.id === clientId && newClients.length > 0) {
      switchClient(newClients[0]);
    }
    
    return true;
  }, [clients, selectedClient]);

  // Load prompts for client
  const fetchPrompts = useCallback(async (clientId: string) => {
    const storedPrompts = loadFromStorage<{ [key: string]: Prompt[] }>(STORAGE_KEYS.PROMPTS, {});
    const clientPrompts = storedPrompts[clientId] || [];
    
    // If no prompts, create defaults based on industry
    if (clientPrompts.length === 0) {
      const client = clients.find(c => c.id === clientId);
      const industryPrompts = INDUSTRY_PRESETS[client?.industry || "Custom"]?.prompts || [];
      const defaultPrompts: Prompt[] = industryPrompts.map((text, idx) => ({
        id: `${clientId}-${idx}`,
        client_id: clientId,
        prompt_text: text.replace("{region}", client?.target_region || "").replace("{competitor}", client?.competitors[0] || "competitor"),
        category: "default",
        is_custom: false,
        is_active: true,
      }));
      
      if (defaultPrompts.length > 0) {
        storedPrompts[clientId] = defaultPrompts;
        saveToStorage(STORAGE_KEYS.PROMPTS, storedPrompts);
        setPrompts(defaultPrompts);
      } else {
        setPrompts([]);
      }
    } else {
      setPrompts(clientPrompts);
    }
  }, [clients]);

  // Load results for client
  const loadClientResults = useCallback((clientId: string) => {
    const allResults = loadFromStorage<{ [key: string]: AuditResult[] }>(STORAGE_KEYS.RESULTS, {});
    const clientResults = allResults[clientId] || [];
    setAuditResults(clientResults);
    updateSummary(clientResults);
    updateCostBreakdown(clientResults);
  }, []);

  // Save results
  const saveClientResults = useCallback((clientId: string, results: AuditResult[]) => {
    const allResults = loadFromStorage<{ [key: string]: AuditResult[] }>(STORAGE_KEYS.RESULTS, {});
    allResults[clientId] = results;
    saveToStorage(STORAGE_KEYS.RESULTS, allResults);
  }, []);

  // Update brand tags
  const updateBrandTags = useCallback((tags: string[]) => {
    if (!selectedClient) return;
    updateClient(selectedClient.id, { brand_tags: tags });
  }, [selectedClient, updateClient]);

  // Update competitors
  const updateCompetitors = useCallback((competitors: string[]) => {
    if (!selectedClient) return;
    updateClient(selectedClient.id, { competitors });
  }, [selectedClient, updateClient]);

  // Run audit for a single prompt
  const runAudit = useCallback(async (promptText: string, promptId?: string): Promise<AuditResult | null> => {
    if (!selectedClient) return null;
    
    setLoading(true);
    setLoadingPromptId(promptId || null);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("geo-audit", {
        body: {
          client_id: selectedClient.id,
          prompt_id: promptId,
          prompt_text: promptText,
          brand_name: selectedClient.brand_name,
          brand_domain: selectedClient.brand_domain,  // For LLM Mentions API
          brand_tags: selectedClient.brand_tags,
          competitors: selectedClient.competitors,
          location_code: selectedClient.location_code,
          location_name: selectedClient.location_name || selectedClient.target_region,  // For LLM Mentions API
          models: selectedModels,
        },
      });

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || "Audit failed");

      const result: AuditResult = {
        id: crypto.randomUUID(),
        prompt_id: promptId || crypto.randomUUID(),
        prompt_text: promptText,
        model_results: data.data.model_results,
        summary: data.data.summary,
        top_sources: data.data.top_sources,
        top_competitors: data.data.top_competitors,
        created_at: data.data.timestamp,
      };

      const newResults = [...auditResults.filter(r => r.prompt_id !== promptId), result];
      setAuditResults(newResults);
      saveClientResults(selectedClient.id, newResults);
      updateSummary(newResults);
      updateCostBreakdown(newResults);
      
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Audit failed";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
      setLoadingPromptId(null);
    }
  }, [selectedClient, selectedModels, auditResults, saveClientResults]);

  // Run audit for all prompts
  const runFullAudit = useCallback(async () => {
    if (!selectedClient || prompts.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    const results: AuditResult[] = [...auditResults];
    
    for (const prompt of prompts) {
      if (results.find(r => r.prompt_id === prompt.id)) continue;
      
      setLoadingPromptId(prompt.id);
      
      try {
        const { data, error: fnError } = await supabase.functions.invoke("geo-audit", {
          body: {
            client_id: selectedClient.id,
            prompt_id: prompt.id,
            prompt_text: prompt.prompt_text,
            brand_name: selectedClient.brand_name,
            brand_domain: selectedClient.brand_domain,  // For LLM Mentions API
            brand_tags: selectedClient.brand_tags,
            competitors: selectedClient.competitors,
            location_code: selectedClient.location_code,
            location_name: selectedClient.location_name || selectedClient.target_region,  // For LLM Mentions API
            models: selectedModels,
          },
        });

        if (!fnError && data?.success) {
          const result: AuditResult = {
            id: crypto.randomUUID(),
            prompt_id: prompt.id,
            prompt_text: prompt.prompt_text,
            model_results: data.data.model_results,
            summary: data.data.summary,
            top_sources: data.data.top_sources,
            top_competitors: data.data.top_competitors,
            created_at: data.data.timestamp,
          };
          results.push(result);
          setAuditResults([...results]);
          saveClientResults(selectedClient.id, results);
          updateSummary(results);
          updateCostBreakdown(results);
        }
        
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.error(`Error auditing: ${prompt.prompt_text}`, err);
      }
    }
    
    setLoading(false);
    setLoadingPromptId(null);
  }, [selectedClient, prompts, selectedModels, auditResults, saveClientResults]);

  // Re-run a specific prompt
  const rerunAudit = useCallback(async (promptId: string) => {
    const prompt = prompts.find(p => p.id === promptId);
    if (!prompt) return null;
    
    // Remove old result first
    const newResults = auditResults.filter(r => r.prompt_id !== promptId);
    setAuditResults(newResults);
    if (selectedClient) saveClientResults(selectedClient.id, newResults);
    
    return runAudit(prompt.prompt_text, promptId);
  }, [prompts, auditResults, selectedClient, saveClientResults, runAudit]);

  // Clear results
  const clearResults = useCallback(() => {
    if (!selectedClient) return;
    setAuditResults([]);
    setSummary(null);
    setSourceSummary([]);
    setCostBreakdown({ total: 0, by_model: {}, by_prompt: {} });
    saveClientResults(selectedClient.id, []);
  }, [selectedClient, saveClientResults]);

  // Update cost breakdown
  const updateCostBreakdown = useCallback((results: AuditResult[]) => {
    const breakdown: CostBreakdown = { total: 0, by_model: {}, by_prompt: {} };
    
    for (const result of results) {
      const promptCost = result.summary.total_cost || 0;
      breakdown.total += promptCost;
      breakdown.by_prompt[result.prompt_text] = promptCost;
      
      for (const mr of result.model_results) {
        if (!breakdown.by_model[mr.model]) breakdown.by_model[mr.model] = 0;
        breakdown.by_model[mr.model] += mr.api_cost || 0;
      }
    }
    
    setCostBreakdown(breakdown);
  }, []);

  // Update summary
  const updateSummary = useCallback((results: AuditResult[]) => {
    if (results.length === 0) {
      setSummary(null);
      setSourceSummary([]);
      return;
    }

    let totalVisible = 0, totalChecks = 0, rankSum = 0, rankCount = 0, totalCitations = 0, totalCost = 0;
    const sourceMap = new Map<string, { count: number; urls: Set<string>; prompts: Set<string> }>();
    const competitorMap = new Map<string, { mentions: number; ranks: number[] }>();
    const modelVisibility: { [model: string]: { visible: number; total: number; cost: number } } = {};

    for (const result of results) {
      totalCost += result.summary.total_cost || 0;
      
      for (const mr of result.model_results) {
        if (!mr.success) continue;
        totalChecks++;
        
        if (!modelVisibility[mr.model]) modelVisibility[mr.model] = { visible: 0, total: 0, cost: 0 };
        modelVisibility[mr.model].total++;
        modelVisibility[mr.model].cost += mr.api_cost || 0;
        
        if (mr.brand_mentioned) { totalVisible++; modelVisibility[mr.model].visible++; }
        if (mr.brand_rank) { rankSum += mr.brand_rank; rankCount++; }
        totalCitations += mr.citation_count;

        for (const c of mr.citations) {
          if (!sourceMap.has(c.domain)) sourceMap.set(c.domain, { count: 0, urls: new Set(), prompts: new Set() });
          const entry = sourceMap.get(c.domain)!;
          entry.count++; entry.urls.add(c.url); entry.prompts.add(result.prompt_text);
        }

        for (const comp of mr.competitors_found) {
          if (!competitorMap.has(comp.name)) competitorMap.set(comp.name, { mentions: 0, ranks: [] });
          const entry = competitorMap.get(comp.name)!;
          entry.mentions += comp.count;
          if (comp.rank) entry.ranks.push(comp.rank);
        }
      }
    }

    setSummary({
      total_prompts: results.length,
      overall_sov: totalChecks > 0 ? Math.round((totalVisible / totalChecks) * 100) : 0,
      average_rank: rankCount > 0 ? Math.round((rankSum / rankCount) * 10) / 10 : null,
      total_citations: totalCitations,
      total_cost: totalCost,
      top_sources: Array.from(sourceMap.entries()).sort((a, b) => b[1].count - a[1].count).slice(0, 10).map(([domain, data]) => ({ domain, count: data.count })),
      top_competitors: Array.from(competitorMap.entries()).sort((a, b) => b[1].mentions - a[1].mentions).slice(0, 5).map(([name, data]) => ({
        name, total_mentions: data.mentions,
        avg_rank: data.ranks.length > 0 ? Math.round((data.ranks.reduce((a, b) => a + b, 0) / data.ranks.length) * 10) / 10 : null,
      })),
      visibility_by_model: modelVisibility,
    });

    setSourceSummary(Array.from(sourceMap.entries()).sort((a, b) => b[1].count - a[1].count).map(([domain, data]) => ({
      domain, full_urls: Array.from(data.urls), total_count: data.count, prompts: Array.from(data.prompts),
    })));
  }, []);

  // Add custom prompt
  const addCustomPrompt = useCallback(async (promptText: string) => {
    if (!selectedClient) return null;
    
    const newPrompt: Prompt = {
      id: crypto.randomUUID(),
      client_id: selectedClient.id,
      prompt_text: promptText,
      category: "custom",
      is_custom: true,
      is_active: true,
    };
    
    const newPrompts = [...prompts, newPrompt];
    setPrompts(newPrompts);
    
    const storedPrompts = loadFromStorage<{ [key: string]: Prompt[] }>(STORAGE_KEYS.PROMPTS, {});
    storedPrompts[selectedClient.id] = newPrompts;
    saveToStorage(STORAGE_KEYS.PROMPTS, storedPrompts);
    
    return newPrompt;
  }, [selectedClient, prompts]);

  // Add multiple prompts at once
  const addMultiplePrompts = useCallback((promptTexts: string[]) => {
    if (!selectedClient) return;
    
    const newPrompts: Prompt[] = promptTexts.filter(t => t.trim()).map(text => ({
      id: crypto.randomUUID(),
      client_id: selectedClient.id,
      prompt_text: text.trim(),
      category: "imported",
      is_custom: true,
      is_active: true,
    }));
    
    const allPrompts = [...prompts, ...newPrompts];
    setPrompts(allPrompts);
    
    const storedPrompts = loadFromStorage<{ [key: string]: Prompt[] }>(STORAGE_KEYS.PROMPTS, {});
    storedPrompts[selectedClient.id] = allPrompts;
    saveToStorage(STORAGE_KEYS.PROMPTS, storedPrompts);
    
    return newPrompts;
  }, [selectedClient, prompts]);

  // Delete prompt
  const deletePrompt = useCallback((promptId: string) => {
    if (!selectedClient) return;
    
    const newPrompts = prompts.filter(p => p.id !== promptId);
    setPrompts(newPrompts);
    
    const storedPrompts = loadFromStorage<{ [key: string]: Prompt[] }>(STORAGE_KEYS.PROMPTS, {});
    storedPrompts[selectedClient.id] = newPrompts;
    saveToStorage(STORAGE_KEYS.PROMPTS, storedPrompts);
    
    const newResults = auditResults.filter(r => r.prompt_id !== promptId);
    setAuditResults(newResults);
    saveClientResults(selectedClient.id, newResults);
    updateSummary(newResults);
    updateCostBreakdown(newResults);
  }, [selectedClient, prompts, auditResults, saveClientResults, updateSummary, updateCostBreakdown]);

  // Clear all prompts
  const clearAllPrompts = useCallback(() => {
    if (!selectedClient) return;
    setPrompts([]);
    const storedPrompts = loadFromStorage<{ [key: string]: Prompt[] }>(STORAGE_KEYS.PROMPTS, {});
    storedPrompts[selectedClient.id] = [];
    saveToStorage(STORAGE_KEYS.PROMPTS, storedPrompts);
  }, [selectedClient]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    if (!selectedClient || auditResults.length === 0) return;

    const rows: string[][] = [
      ["Prompt", "Model", "Provider", "Visible", "Rank", "Mentions", "Winner", "Citations", "Sentiment", "Cost ($)"]
    ];

    for (const result of auditResults) {
      for (const mr of result.model_results) {
        rows.push([
          `"${result.prompt_text.replace(/"/g, '""')}"`,
          mr.model_name, mr.provider,
          mr.brand_mentioned ? "Yes" : "No",
          mr.brand_rank?.toString() || "-",
          mr.brand_mention_count.toString(),
          mr.winner_brand || "-",
          mr.citation_count.toString(),
          mr.brand_sentiment,
          (mr.api_cost || 0).toFixed(4),
        ]);
      }
    }

    downloadFile(`${selectedClient.slug}-audit-${new Date().toISOString().split("T")[0]}.csv`, rows.map(r => r.join(",")).join("\n"), "text/csv");
  }, [selectedClient, auditResults]);

  // Export prompts to JSON
  const exportPrompts = useCallback(() => {
    if (!selectedClient) return;

    const data = {
      client: selectedClient.name,
      brand: selectedClient.brand_name,
      brand_tags: selectedClient.brand_tags,
      competitors: selectedClient.competitors,
      prompts: prompts.map(p => ({ text: p.prompt_text, category: p.category, is_custom: p.is_custom })),
      exported_at: new Date().toISOString(),
    };

    downloadFile(`${selectedClient.slug}-prompts-${new Date().toISOString().split("T")[0]}.json`, JSON.stringify(data, null, 2), "application/json");
  }, [selectedClient, prompts]);

  // Export full report as formatted text document
  const exportFullReport = useCallback(() => {
    if (!selectedClient || auditResults.length === 0) return;

    const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const lines: string[] = [];
    
    // Header
    lines.push("═".repeat(70));
    lines.push(`FORZEO AI VISIBILITY REPORT`);
    lines.push(`Client: ${selectedClient.name}`);
    lines.push(`Generated: ${date}`);
    lines.push("═".repeat(70));
    lines.push("");
    
    // Executive Summary
    lines.push("EXECUTIVE SUMMARY");
    lines.push("─".repeat(40));
    lines.push(`Brand: ${selectedClient.brand_name}`);
    lines.push(`Industry: ${selectedClient.industry}`);
    lines.push(`Target Region: ${selectedClient.target_region}`);
    lines.push("");
    
    if (summary) {
      lines.push(`Share of Voice: ${summary.overall_sov}%`);
      lines.push(`Average Rank: ${summary.average_rank ? `#${summary.average_rank}` : "Not ranked"}`);
      lines.push(`Total Citations: ${summary.total_citations}`);
      lines.push(`Prompts Analyzed: ${summary.total_prompts}`);
      lines.push(`Total API Cost: $${summary.total_cost.toFixed(4)}`);
    }
    lines.push("");
    
    // Visibility by Model
    lines.push("VISIBILITY BY AI MODEL");
    lines.push("─".repeat(40));
    if (summary) {
      Object.entries(summary.visibility_by_model).forEach(([modelId, data]) => {
        const model = AI_MODELS.find(m => m.id === modelId);
        const pct = data.total > 0 ? Math.round((data.visible / data.total) * 100) : 0;
        lines.push(`${model?.name || modelId}: ${data.visible}/${data.total} visible (${pct}%) - Cost: $${data.cost.toFixed(4)}`);
      });
    }
    lines.push("");
    
    // Competitor Analysis
    lines.push("COMPETITOR ANALYSIS");
    lines.push("─".repeat(40));
    if (summary?.top_competitors.length) {
      summary.top_competitors.forEach((comp, idx) => {
        lines.push(`${idx + 1}. ${comp.name}: ${comp.total_mentions} mentions${comp.avg_rank ? `, Avg Rank #${comp.avg_rank}` : ""}`);
      });
    } else {
      lines.push("No competitor data available");
    }
    lines.push("");
    
    // Top Citation Sources
    lines.push("TOP CITATION SOURCES");
    lines.push("─".repeat(40));
    sourceSummary.slice(0, 15).forEach((source, idx) => {
      lines.push(`${idx + 1}. ${source.domain} (${source.total_count} citations)`);
      source.full_urls.slice(0, 2).forEach(url => {
        lines.push(`   → ${url}`);
      });
    });
    lines.push("");
    
    // Detailed Results by Prompt
    lines.push("DETAILED RESULTS BY PROMPT");
    lines.push("═".repeat(70));
    
    auditResults.forEach((result, idx) => {
      lines.push("");
      lines.push(`[${idx + 1}] ${result.prompt_text}`);
      lines.push("─".repeat(50));
      lines.push(`SOV: ${result.summary.share_of_voice}% | Rank: ${result.summary.average_rank || "N/A"} | Citations: ${result.summary.total_citations} | Cost: $${result.summary.total_cost.toFixed(4)}`);
      lines.push("");
      
      result.model_results.forEach(mr => {
        const status = !mr.success ? "ERROR" : mr.brand_mentioned ? "VISIBLE" : "NOT VISIBLE";
        lines.push(`  ${mr.model_name}: ${status}${mr.brand_rank ? ` (Rank #${mr.brand_rank})` : ""}${mr.brand_mention_count > 0 ? ` - ${mr.brand_mention_count} mentions` : ""}`);
        
        if (mr.competitors_found?.length > 0) {
          lines.push(`    Competitors: ${mr.competitors_found.map(c => `${c.name}(${c.count})`).join(", ")}`);
        }
        
        if (mr.citations.length > 0) {
          lines.push(`    Citations (${mr.citations.length}):`);
          mr.citations.slice(0, 5).forEach(c => {
            lines.push(`      • ${c.domain}: ${c.title || c.url}`);
          });
          if (mr.citations.length > 5) {
            lines.push(`      ... and ${mr.citations.length - 5} more`);
          }
        }
      });
    });
    
    // All Citations Summary
    lines.push("");
    lines.push("═".repeat(70));
    lines.push("COMPLETE CITATION LIST");
    lines.push("═".repeat(70));
    
    const allCitations = new Map<string, { url: string; title: string; count: number; prompts: string[] }>();
    auditResults.forEach(result => {
      result.model_results.forEach(mr => {
        mr.citations.forEach(c => {
          const key = c.url;
          if (allCitations.has(key)) {
            const existing = allCitations.get(key)!;
            existing.count++;
            if (!existing.prompts.includes(result.prompt_text)) {
              existing.prompts.push(result.prompt_text);
            }
          } else {
            allCitations.set(key, { url: c.url, title: c.title || c.domain, count: 1, prompts: [result.prompt_text] });
          }
        });
      });
    });
    
    Array.from(allCitations.values())
      .sort((a, b) => b.count - a.count)
      .forEach((citation, idx) => {
        lines.push(`${idx + 1}. ${citation.title}`);
        lines.push(`   URL: ${citation.url}`);
        lines.push(`   Cited ${citation.count} time(s) in: ${citation.prompts.slice(0, 2).join(", ")}${citation.prompts.length > 2 ? "..." : ""}`);
        lines.push("");
      });
    
    // Footer
    lines.push("═".repeat(70));
    lines.push("Report generated by Forzeo AI Visibility Platform");
    lines.push(`https://forzeo.com | ${new Date().toISOString()}`);
    lines.push("═".repeat(70));

    downloadFile(`${selectedClient.slug}-visibility-report-${new Date().toISOString().split("T")[0]}.txt`, lines.join("\n"), "text/plain");
  }, [selectedClient, auditResults, summary, costBreakdown, prompts, sourceSummary]);

  // Generate prompts from image using AI
  const generatePromptsFromImage = useCallback(async (imageBase64: string): Promise<string[]> => {
    try {
      // Use Groq to analyze the image description and generate prompts
      const { data, error: fnError } = await supabase.functions.invoke("generate-content", {
        body: {
          prompt: `Based on this image content/description, generate 5-10 search prompts that users might ask AI assistants about this topic. The image appears to contain keywords, tags, or topics related to: ${imageBase64.substring(0, 500)}...

Generate prompts in this format (one per line):
- "Best [topic] in [region] 2025"
- "How to choose [topic]"
- "Top [topic] recommendations"
- etc.

Only output the prompts, one per line, no numbering or bullets.`,
          systemPrompt: "You are a search prompt generator. Generate realistic search queries that users would ask AI assistants. Output only the prompts, one per line.",
        },
      });

      if (fnError) throw fnError;
      
      const prompts = (data?.response || "")
        .split("\n")
        .map((l: string) => l.replace(/^[-•*]\s*/, "").replace(/^["']|["']$/g, "").trim())
        .filter((l: string) => l.length > 10 && l.length < 200);
      
      return prompts;
    } catch (err) {
      console.error("Failed to generate prompts from image:", err);
      return [];
    }
  }, []);

  // Generate prompts from keywords/tags
  const generatePromptsFromKeywords = useCallback(async (keywords: string): Promise<string[]> => {
    if (!selectedClient) return [];
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-content", {
        body: {
          prompt: `Generate 8-10 search prompts for AI visibility analysis based on these keywords/tags:
Keywords: ${keywords}
Brand: ${selectedClient.brand_name}
Industry: ${selectedClient.industry}
Region: ${selectedClient.target_region}

Generate realistic search queries that users would ask AI assistants (ChatGPT, Google, etc.) about this topic.
Include a mix of:
- "Best [product/service] in [region]" queries
- Comparison queries ("[brand] vs [competitor]")
- Feature-specific queries
- Problem-solving queries

Output only the prompts, one per line, no numbering.`,
          systemPrompt: "You are a search prompt generator for AI visibility analysis. Generate realistic, diverse search queries.",
        },
      });

      if (fnError) throw fnError;
      
      const prompts = (data?.response || "")
        .split("\n")
        .map((l: string) => l.replace(/^[-•*\d.]\s*/, "").replace(/^["']|["']$/g, "").trim())
        .filter((l: string) => l.length > 10 && l.length < 200);
      
      return prompts;
    } catch (err) {
      console.error("Failed to generate prompts:", err);
      return [];
    }
  }, [selectedClient]);

  // Generate content for GEO optimization
  const generateContent = useCallback(async (topic: string, contentType: string = "article"): Promise<string | null> => {
    if (!selectedClient) return null;
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate-content", {
        body: {
          prompt: `Write a ${contentType} optimized for AI visibility about: ${topic}

Brand to feature: ${selectedClient.brand_name}
Industry: ${selectedClient.industry}
Competitors to mention: ${selectedClient.competitors.slice(0, 3).join(", ")}

Requirements:
1. Naturally mention ${selectedClient.brand_name} 2-3 times
2. Include factual, authoritative information
3. Use proper headings and structure
4. Include a numbered list or comparison where appropriate
5. Target 600-1000 words
6. Make it suitable for AI models to reference and cite

Format in clean Markdown.`,
          systemPrompt: "You are an expert content writer specializing in GEO (Generative Engine Optimization). Create content that AI models would reference and cite.",
        },
      });

      if (fnError) throw fnError;
      return data?.response || null;
    } catch (err) {
      console.error("Content generation failed:", err);
      return null;
    }
  }, [selectedClient]);

  // Get all citations across all results
  const getAllCitations = useCallback(() => {
    const citationMap = new Map<string, { 
      url: string; 
      title: string; 
      domain: string; 
      snippet?: string;
      count: number; 
      prompts: string[];
      models: string[];
    }>();
    
    auditResults.forEach(result => {
      result.model_results.forEach(mr => {
        mr.citations.forEach(c => {
          const key = c.url;
          if (citationMap.has(key)) {
            const existing = citationMap.get(key)!;
            existing.count++;
            if (!existing.prompts.includes(result.prompt_text)) {
              existing.prompts.push(result.prompt_text);
            }
            if (!existing.models.includes(mr.model_name)) {
              existing.models.push(mr.model_name);
            }
          } else {
            citationMap.set(key, {
              url: c.url,
              title: c.title || "",
              domain: c.domain,
              snippet: c.snippet,
              count: 1,
              prompts: [result.prompt_text],
              models: [mr.model_name],
            });
          }
        });
      });
    });
    
    return Array.from(citationMap.values()).sort((a, b) => b.count - a.count);
  }, [auditResults]);

  // Import from JSON
  const importFromJSON = useCallback((jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      
      // Import prompts
      if (data.prompts && Array.isArray(data.prompts)) {
        const texts = data.prompts.map((p: any) => typeof p === "string" ? p : p.text || p.prompt_text).filter(Boolean);
        addMultiplePrompts(texts);
      }
      
      // Import settings
      if (data.brand_tags && selectedClient) updateBrandTags(data.brand_tags);
      if (data.competitors && selectedClient) updateCompetitors(data.competitors);
      
      return true;
    } catch (err) {
      setError("Invalid JSON format");
      return false;
    }
  }, [addMultiplePrompts, selectedClient, updateBrandTags, updateCompetitors]);

  // Import from CSV
  const importFromCSV = useCallback((csvData: string) => {
    try {
      const lines = csvData.split("\n").map(l => l.trim()).filter(Boolean);
      const prompts: string[] = [];
      
      for (const line of lines) {
        // Handle quoted CSV
        const match = line.match(/^"([^"]+)"|^([^,]+)/);
        if (match) {
          const text = (match[1] || match[2]).trim();
          if (text && !text.toLowerCase().includes("prompt") && text.length > 5) {
            prompts.push(text);
          }
        }
      }
      
      if (prompts.length > 0) {
        addMultiplePrompts(prompts);
        return true;
      }
      return false;
    } catch (err) {
      setError("Invalid CSV format");
      return false;
    }
  }, [addMultiplePrompts]);

  // Import from plain text (one prompt per line)
  const importFromText = useCallback((textData: string) => {
    const lines = textData.split("\n").map(l => l.trim()).filter(l => l.length > 5);
    if (lines.length > 0) {
      addMultiplePrompts(lines);
      return true;
    }
    return false;
  }, [addMultiplePrompts]);

  // Auto-detect and import
  const importData = useCallback((data: string, filename?: string) => {
    const ext = filename?.split(".").pop()?.toLowerCase();
    
    if (ext === "json" || data.trim().startsWith("{") || data.trim().startsWith("[")) {
      return importFromJSON(data);
    } else if (ext === "csv" || data.includes(",")) {
      return importFromCSV(data);
    } else {
      return importFromText(data);
    }
  }, [importFromJSON, importFromCSV, importFromText]);

  // Switch client
  const switchClient = useCallback((client: Client) => {
    setSelectedClient(client);
    saveToStorage(STORAGE_KEYS.SELECTED_CLIENT, client.id);
    loadClientResults(client.id);
  }, [loadClientResults]);

  // Helper to download file
  function downloadFile(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // Load on mount
  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Load prompts and results when client changes
  useEffect(() => {
    if (selectedClient) {
      fetchPrompts(selectedClient.id);
      loadClientResults(selectedClient.id);
    }
  }, [selectedClient, fetchPrompts, loadClientResults]);

  return {
    // State
    clients, selectedClient, prompts, auditResults, summary, sourceSummary, costBreakdown,
    selectedModels, loading, loadingPromptId, error,
    // Client management
    addClient, updateClient, deleteClient, switchClient,
    // Model selection
    setSelectedModels,
    // Audit actions
    runAudit, runFullAudit, rerunAudit, clearResults,
    // Prompt management
    addCustomPrompt, addMultiplePrompts, deletePrompt, clearAllPrompts,
    // Settings
    updateBrandTags, updateCompetitors,
    // Export
    exportToCSV, exportPrompts, exportFullReport,
    // Import
    importData, importFromJSON, importFromCSV, importFromText,
    // AI Features
    generatePromptsFromKeywords, generatePromptsFromImage, generateContent, getAllCitations,
    // Utilities
    fetchClients, fetchPrompts,
    INDUSTRY_PRESETS, LOCATION_CODES,
  };
}
