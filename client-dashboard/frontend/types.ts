/**
 * Forzeo Client Dashboard - TypeScript Types
 * 
 * All interfaces and types used across the dashboard.
 */

// ============================================
// AI MODEL CONFIGURATION
// ============================================

/**
 * Configuration for an AI model that can be queried
 */
export interface AIModel {
  id: string;           // Unique identifier (e.g., "google_serp")
  name: string;         // Display name (e.g., "Google SERP")
  provider: string;     // API provider (e.g., "DataForSEO")
  color: string;        // UI color for charts/badges
  costPerQuery: number; // Cost in USD per query
}

/**
 * Available AI models for visibility analysis
 */
export const AI_MODELS: AIModel[] = [
  { id: "google_serp", name: "Google SERP", provider: "DataForSEO", color: "#4285f4", costPerQuery: 0.002 },
  { id: "google_ai_overview", name: "Google AI Overview", provider: "DataForSEO", color: "#ea4335", costPerQuery: 0.003 },
  { id: "groq_llama", name: "Groq Llama", provider: "Groq", color: "#f97316", costPerQuery: 0 },
];

// ============================================
// CLIENT CONFIGURATION
// ============================================

/**
 * A client/brand being tracked for AI visibility
 */
export interface Client {
  id: string;
  name: string;              // Display name (e.g., "Juleo Club")
  brand_name: string;        // Primary brand to detect (e.g., "Juleo")
  brand_tags: string[];      // Alternative names to detect
  slug: string;              // URL-safe identifier
  target_region: string;     // Geographic target (e.g., "India")
  location_code: number;     // DataForSEO location code
  industry: string;          // Industry category
  competitors: string[];     // Competitor brand names
  logo_url?: string;         // Optional logo URL
  primary_color: string;     // UI accent color
  created_at: string;        // ISO timestamp
  is_default?: boolean;      // Pre-configured client
}

/**
 * Industry presets with default competitors and prompts
 */
export interface IndustryPreset {
  competitors: string[];
  prompts: string[];
}

/**
 * Available industry presets
 */
export const INDUSTRY_PRESETS: { [key: string]: IndustryPreset } = {
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

/**
 * DataForSEO location codes for common regions
 */
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

// ============================================
// PROMPTS
// ============================================

/**
 * A search prompt to analyze for visibility
 */
export interface Prompt {
  id: string;
  client_id: string;
  prompt_text: string;       // The search query
  category: string;          // "default" | "custom" | "imported"
  is_custom: boolean;        // User-added vs preset
  is_active: boolean;        // Include in audits
}

// ============================================
// CITATIONS
// ============================================

/**
 * A citation/source referenced by an AI model
 */
export interface Citation {
  url: string;               // Full URL
  title: string;             // Page title
  domain: string;            // Domain name
  position?: number;         // Position in results
  snippet?: string;          // Text snippet
}

/**
 * Aggregated citation data across all results
 */
export interface CitationSummary {
  url: string;
  title: string;
  domain: string;
  snippet?: string;
  count: number;             // Times cited
  prompts: string[];         // Prompts where cited
  models: string[];          // Models that cited it
}

// ============================================
// MODEL RESULTS
// ============================================

/**
 * Result from a single AI model for a prompt
 */
export interface ModelResult {
  model: string;             // Model ID
  model_name: string;        // Display name
  provider: string;          // API provider
  color?: string;            // UI color
  success: boolean;          // Query succeeded
  error?: string;            // Error message if failed
  raw_response: string;      // Full response text
  response_length: number;   // Response character count
  brand_mentioned: boolean;  // Brand found in response
  brand_mention_count: number; // Number of mentions
  brand_rank: number | null; // Position in numbered list
  brand_sentiment: string;   // "positive" | "neutral" | "negative"
  matched_terms: string[];   // Which brand tags matched
  winner_brand: string;      // Top-ranked brand
  competitors_found: Array<{
    name: string;
    count: number;
    rank: number | null;
    sentiment: string;
  }>;
  citations: Citation[];
  citation_count: number;
  api_cost: number;          // Cost in USD
}

// ============================================
// AUDIT RESULTS
// ============================================

/**
 * Complete audit result for a single prompt
 */
export interface AuditResult {
  id: string;
  prompt_id: string;
  prompt_text: string;
  model_results: ModelResult[];
  summary: {
    share_of_voice: number;      // % of models with brand mention
    average_rank: number | null; // Average position in lists
    total_models_checked: number;
    visible_in: number;          // Models where brand appeared
    total_citations: number;
    total_cost: number;
  };
  top_sources: Array<{ domain: string; count: number; url?: string; title?: string }>;
  top_competitors: Array<{ name: string; total_mentions: number; avg_rank: number | null }>;
  created_at: string;
}

// ============================================
// DASHBOARD SUMMARIES
// ============================================

/**
 * Aggregated dashboard metrics across all prompts
 */
export interface DashboardSummary {
  total_prompts: number;
  overall_sov: number;           // Overall Share of Voice %
  average_rank: number | null;
  total_citations: number;
  total_cost: number;
  top_sources: Array<{ domain: string; count: number }>;
  top_competitors: Array<{ name: string; total_mentions: number; avg_rank: number | null }>;
  visibility_by_model: {
    [model: string]: {
      visible: number;           // Prompts where brand visible
      total: number;             // Total prompts checked
      cost: number;              // Total cost for this model
    };
  };
}

/**
 * Source/domain summary with full URLs
 */
export interface SourceSummary {
  domain: string;
  full_urls: string[];
  total_count: number;
  prompts: string[];             // Prompts that cited this source
}

/**
 * Cost breakdown by model and prompt
 */
export interface CostBreakdown {
  total: number;
  by_model: { [model: string]: number };
  by_prompt: { [prompt: string]: number };
}

// ============================================
// API REQUEST/RESPONSE
// ============================================

/**
 * Request body for geo-audit API
 */
export interface GeoAuditRequest {
  client_id?: string;
  prompt_id?: string;
  prompt_text: string;
  brand_name: string;
  brand_tags?: string[];
  competitors?: string[];
  location_code?: number;
  models?: string[];
  save_to_db?: boolean;
}

/**
 * Response from geo-audit API
 */
export interface GeoAuditResponse {
  success: boolean;
  error?: string;
  data?: {
    id?: string;
    client_id?: string;
    prompt_id?: string;
    prompt_text: string;
    brand_name: string;
    brand_tags: string[];
    competitors: string[];
    models_requested: string[];
    summary: {
      share_of_voice: number;
      average_rank: number | null;
      total_models_checked: number;
      models_failed: number;
      visible_in: number;
      total_citations: number;
      total_cost: number;
    };
    model_results: ModelResult[];
    top_sources: Array<{ domain: string; count: number }>;
    top_competitors: Array<{ name: string; total_mentions: number; avg_rank: number | null }>;
    available_models: AIModel[];
    timestamp: string;
  };
}

/**
 * Request body for generate-content API
 */
export interface GenerateContentRequest {
  prompt: string;
  systemPrompt?: string;
  type?: "article" | "listicle" | "comparison" | "guide" | "faq";
}

/**
 * Response from generate-content API
 */
export interface GenerateContentResponse {
  response: string;
  type: string;
  generatedAt: string;
  error?: string;
}
