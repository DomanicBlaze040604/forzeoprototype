# Forzeo Client Dashboard - Architecture

Technical documentation explaining how the system works.

## Scoring Formulas & Algorithms

This section explains all the visibility metrics, ranking logic, and formulas used in the dashboard.

### Share of Voice (SOV)

The primary metric measuring brand visibility across AI models.

```
SOV = (Models where brand mentioned / Total successful models) × 100

Example:
- Google SERP: Brand mentioned ✓
- Google AI Overview: Brand NOT mentioned ✗
- Groq Llama: Brand mentioned ✓

SOV = (2 / 3) × 100 = 67%
```

**Interpretation:**
- 70-100%: Excellent visibility - brand dominates AI responses
- 50-69%: Good visibility - brand appears in most responses
- 25-49%: Moderate visibility - room for improvement
- 0-24%: Low visibility - urgent optimization needed

### Brand Rank Detection

Extracts brand position from numbered lists in AI responses.

```javascript
// Algorithm: Parse numbered list patterns
const patterns = [
  /^\s*(\d+)[.)\]]\s*\*{0,2}(.+)/  // Matches: "1. Brand", "2) Brand", "3] Brand"
];

// Example response:
// "1. Bumble - Great for women
//  2. Juleo - Verified profiles
//  3. Tinder - Most popular"

// Result: Juleo rank = 2
```

**Rank Scoring:**
- Rank #1: Best possible position
- Rank #2-3: Strong position
- Rank #4-5: Moderate position
- Rank #6+: Needs improvement
- No rank: Brand mentioned but not in a list

### Average Rank Calculation

```
Average Rank = Sum of all ranks / Number of models with rank

Example:
- Google SERP: Rank #2
- Google AI Overview: Rank #3
- Groq Llama: No rank (not counted)

Average Rank = (2 + 3) / 2 = 2.5
```

### Brand Mention Detection

Counts all occurrences of brand name and alternative tags.

```javascript
// Input
brandName = "Juleo"
brandTags = ["Juleo Club", "juleo.club"]

// Algorithm
function countMentions(response, terms) {
  let total = 0;
  const lower = response.toLowerCase();
  
  for (const term of terms) {
    let idx = 0;
    while ((idx = lower.indexOf(term.toLowerCase(), idx)) !== -1) {
      total++;
      idx++;
    }
  }
  return total;
}

// Example response: "Juleo is great. Juleo Club offers verified profiles."
// Result: 3 mentions (Juleo×2, Juleo Club×1)
```

### Sentiment Analysis

Analyzes context around brand mentions.

```javascript
const positiveWords = [
  "best", "top", "excellent", "recommended", "leading",
  "trusted", "popular", "great", "amazing", "reliable", "safe"
];

const negativeWords = [
  "avoid", "poor", "worst", "bad", "unreliable",
  "scam", "fake", "terrible", "issues", "problems"
];

function analyzeSentiment(context) {
  const lower = context.toLowerCase();
  const posCount = positiveWords.filter(w => lower.includes(w)).length;
  const negCount = negativeWords.filter(w => lower.includes(w)).length;
  
  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  return "neutral";
}

// Context window: 100 characters before and after brand mention
```

### Winner Brand Detection

Determines which brand "wins" in each response.

```javascript
function findWinner(response, brandName, competitors) {
  let winner = "";
  let maxCount = 0;
  let topRank = 999;
  
  for (const brand of [brandName, ...competitors]) {
    const data = parseBrandData(response, brand);
    
    // Rank #1 always wins
    if (data.rank === 1) return brand;
    
    // Otherwise: most mentions wins, rank breaks ties
    if (data.count > maxCount || 
        (data.count === maxCount && (data.rank || 999) < topRank)) {
      maxCount = data.count;
      topRank = data.rank || 999;
      winner = brand;
    }
  }
  
  return winner;
}
```

### Competitor Gap Analysis

Compares your brand against competitors.

```javascript
// For each competitor, calculate:
competitorData = {
  name: "Bumble",
  total_mentions: 15,        // Sum across all prompts/models
  avg_rank: 1.5,             // Average position in lists
  visibility_pct: 80         // % of responses mentioning them
}

// Gap = Competitor visibility - Your visibility
// Positive gap = competitor is ahead
// Negative gap = you are ahead
```

### Citation Authority Scoring

Ranks citation sources by frequency and relevance.

```javascript
// Aggregate citations across all results
const sourceMap = new Map();

for (const result of auditResults) {
  for (const modelResult of result.model_results) {
    for (const citation of modelResult.citations) {
      if (!sourceMap.has(citation.domain)) {
        sourceMap.set(citation.domain, { count: 0, urls: new Set(), prompts: new Set() });
      }
      sourceMap.get(citation.domain).count++;
      sourceMap.get(citation.domain).urls.add(citation.url);
      sourceMap.get(citation.domain).prompts.add(result.prompt_text);
    }
  }
}

// Sort by count descending
const topSources = Array.from(sourceMap.entries())
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 10);
```

### Per-Model Visibility Calculation

Tracks visibility separately for each AI model.

```javascript
// Structure: { model_id: { visible: number, total: number, cost: number } }
const modelVisibility = {};

for (const result of auditResults) {
  for (const mr of result.model_results) {
    if (!mr.success) continue;  // Skip failed queries
    
    if (!modelVisibility[mr.model]) {
      modelVisibility[mr.model] = { visible: 0, total: 0, cost: 0 };
    }
    
    modelVisibility[mr.model].total++;
    modelVisibility[mr.model].cost += mr.api_cost || 0;
    
    if (mr.brand_mentioned) {
      modelVisibility[mr.model].visible++;
    }
  }
}

// Per-model SOV
const modelSOV = (visible / total) * 100;
```

### Domain Extraction

Extracts clean domain from URLs for citation grouping.

```javascript
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

// Example:
// "https://www.example.com/page" → "example.com"
// "https://blog.example.com/post" → "blog.example.com"
```

### Featured Snippet Detection

Identifies Google's featured answer box.

```javascript
// DataForSEO returns item.type === "featured_snippet"
for (const item of serpItems) {
  if (item.type === "featured_snippet") {
    featuredSnippet = item.description || item.title || "";
    // Featured snippet citation gets position 0 (top)
    citations.push({
      url: item.url,
      title: item.title,
      domain: extractDomain(item.url),
      position: 0,  // Special position for featured
      snippet: item.description
    });
  }
}
```

### People Also Ask (PAA) Extraction

Captures related questions from Google SERP.

```javascript
// DataForSEO returns item.type === "people_also_ask"
const peopleAlsoAsk = [];

for (const item of serpItems) {
  if (item.type === "people_also_ask" && item.items) {
    for (const paa of item.items) {
      peopleAlsoAsk.push(paa.title);
      // Include expanded answers if available
      if (paa.expanded_element?.description) {
        responseText += `Q: ${paa.title}\nA: ${paa.expanded_element.description}\n`;
      }
    }
  }
}
```

### AI Overview Reference Extraction

Parses Google AI Overview citations.

```javascript
// DataForSEO returns item.type === "ai_overview"
for (const item of aiOverviewItems) {
  if (item.type === "ai_overview" && item.items) {
    for (const subItem of item.items) {
      // Extract text content
      if (subItem.text) responseText += subItem.text + "\n";
      
      // Extract references/citations
      if (subItem.references) {
        subItem.references.forEach((ref, idx) => {
          citations.push({
            url: ref.url,
            title: ref.title,
            domain: extractDomain(ref.url),
            position: idx + 1,
            snippet: ref.snippet
          });
        });
      }
    }
  }
}
```

### Import Format Detection

Auto-detects import format (JSON, CSV, or plain text).

```javascript
function importData(data, filename) {
  const ext = filename?.split(".").pop()?.toLowerCase();
  
  // Check file extension first
  if (ext === "json") return importFromJSON(data);
  if (ext === "csv") return importFromCSV(data);
  if (ext === "txt") return importFromText(data);
  
  // Auto-detect from content
  if (data.trim().startsWith("{") || data.trim().startsWith("[")) {
    return importFromJSON(data);
  }
  if (data.includes(",") && data.includes("\n")) {
    return importFromCSV(data);
  }
  return importFromText(data);  // One prompt per line
}
```

### CSV Import Parsing

Handles quoted CSV values.

```javascript
function importFromCSV(csvData) {
  const lines = csvData.split("\n").map(l => l.trim()).filter(Boolean);
  const prompts = [];
  
  for (const line of lines) {
    // Handle quoted values: "prompt text, with comma"
    const match = line.match(/^"([^"]+)"|^([^,]+)/);
    if (match) {
      const text = (match[1] || match[2]).trim();
      // Skip header rows
      if (text && !text.toLowerCase().includes("prompt") && text.length > 5) {
        prompts.push(text);
      }
    }
  }
  
  return prompts;
}
```

### Report Export Formatting

Generates formatted text report (not JSON).

```javascript
function exportFullReport() {
  const lines = [];
  
  // Header with box drawing characters
  lines.push("═".repeat(70));
  lines.push("FORZEO AI VISIBILITY REPORT");
  lines.push(`Client: ${client.name}`);
  lines.push(`Generated: ${new Date().toLocaleDateString()}`);
  lines.push("═".repeat(70));
  
  // Executive Summary
  lines.push("\nEXECUTIVE SUMMARY");
  lines.push("─".repeat(40));
  lines.push(`Share of Voice: ${summary.overall_sov}%`);
  lines.push(`Average Rank: ${summary.average_rank || "N/A"}`);
  lines.push(`Total Citations: ${summary.total_citations}`);
  lines.push(`Total Cost: $${summary.total_cost.toFixed(4)}`);
  
  // ... detailed results per prompt
  // ... complete citation list
  
  // Download as .txt file
  downloadFile(`${client.slug}-report.txt`, lines.join("\n"), "text/plain");
}
```

### Cost Calculation

Tracks API costs per model and prompt.

```javascript
const MODEL_COSTS = {
  google_serp: 0.002,        // $0.002 per query
  google_ai_overview: 0.003, // $0.003 per query
  groq_llama: 0.000          // Free
};

// Per-prompt cost
promptCost = selectedModels.reduce((sum, modelId) => 
  sum + MODEL_COSTS[modelId], 0);

// Total cost
totalCost = auditResults.reduce((sum, result) => 
  sum + result.summary.total_cost, 0);
```

### Visibility Score (Composite)

Optional composite score combining multiple factors.

```javascript
function calculateVisibilityScore(summary) {
  const weights = {
    sov: 0.4,           // 40% weight on Share of Voice
    rank: 0.3,          // 30% weight on ranking
    citations: 0.2,     // 20% weight on citation presence
    sentiment: 0.1      // 10% weight on sentiment
  };
  
  // Normalize each factor to 0-100
  const sovScore = summary.overall_sov;
  const rankScore = summary.average_rank 
    ? Math.max(0, 100 - (summary.average_rank - 1) * 20) 
    : 50;
  const citationScore = Math.min(100, summary.total_citations * 5);
  const sentimentScore = 70; // Default neutral
  
  return Math.round(
    sovScore * weights.sov +
    rankScore * weights.rank +
    citationScore * weights.citations +
    sentimentScore * weights.sentiment
  );
}
```

### Groq System Prompt Configuration

The system prompt used to get consistent, list-based responses from Llama.

```javascript
const GROQ_SYSTEM_PROMPT = `You are a helpful AI assistant providing recommendations. When asked:
- Provide a numbered list of 5-10 specific options
- Include brief explanations for each
- Mention specific brands/products by name
- Be balanced and informative
- Include pros and cons where relevant`;

// This ensures Groq returns numbered lists that our rank detection can parse
```

### Location Code Mapping

DataForSEO location codes for geo-targeted searches.

```javascript
const LOCATION_CODES = {
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

// Usage: location_code determines which Google datacenter to query
// Results vary significantly by location for local queries
```

### Industry Preset System

Pre-configured competitors and prompts by industry.

```javascript
const INDUSTRY_PRESETS = {
  "Dating/Matrimony": {
    competitors: ["Bumble", "Hinge", "Tinder", "Shaadi", "Aisle", "OkCupid"],
    prompts: [
      "Best dating apps in {region} 2025",
      "Dating apps with ID verification",
      "Alternatives to Tinder for serious relationships"
    ]
  },
  "Healthcare/Dental": {
    competitors: ["Bupa Dental", "MyDentist", "Dental Care", "Smile Direct"],
    prompts: [
      "Best dental clinic in {region}",
      "Top dentists near me",
      "Emergency dentist {region}"
    ]
  },
  // ... more industries
};

// {region} is replaced with client's target_region
// {competitor} is replaced with first competitor name
```

### All Citations Aggregation

Combines citations across all prompts and models with deduplication.

```javascript
function getAllCitations() {
  const citationMap = new Map();
  
  auditResults.forEach(result => {
    result.model_results.forEach(mr => {
      mr.citations.forEach(c => {
        const key = c.url;  // Dedupe by URL
        
        if (citationMap.has(key)) {
          const existing = citationMap.get(key);
          existing.count++;
          
          // Track which prompts cited this URL
          if (!existing.prompts.includes(result.prompt_text)) {
            existing.prompts.push(result.prompt_text);
          }
          
          // Track which models cited this URL
          if (!existing.models.includes(mr.model_name)) {
            existing.models.push(mr.model_name);
          }
        } else {
          citationMap.set(key, {
            url: c.url,
            title: c.title,
            domain: c.domain,
            snippet: c.snippet,
            count: 1,
            prompts: [result.prompt_text],
            models: [mr.model_name]
          });
        }
      });
    });
  });
  
  // Sort by citation count descending
  return Array.from(citationMap.values())
    .sort((a, b) => b.count - a.count);
}
```

### AI Prompt Generation

Uses Groq to generate search prompts from keywords.

```javascript
async function generatePromptsFromKeywords(keywords) {
  const prompt = `Generate 8-10 search prompts for AI visibility analysis based on:
Keywords: ${keywords}
Brand: ${client.brand_name}
Industry: ${client.industry}
Region: ${client.target_region}

Include a mix of:
- "Best [product/service] in [region]" queries
- Comparison queries ("[brand] vs [competitor]")
- Feature-specific queries
- Problem-solving queries

Output only the prompts, one per line, no numbering.`;

  const response = await callGroq(prompt);
  
  // Parse response into array of prompts
  return response.split("\n")
    .map(l => l.replace(/^[-•*\d.]\s*/, "").trim())
    .filter(l => l.length > 10 && l.length < 200);
}
```

### Content Generation for GEO

Generates AI-optimized content that positions brand for visibility.

```javascript
async function generateContent(topic, contentType) {
  const prompt = `Write a ${contentType} optimized for AI visibility about: ${topic}

Brand to feature: ${client.brand_name}
Industry: ${client.industry}
Competitors to mention: ${client.competitors.slice(0, 3).join(", ")}

Requirements:
1. Naturally mention ${client.brand_name} 2-3 times
2. Include factual, authoritative information
3. Use proper headings and structure
4. Include a numbered list or comparison where appropriate
5. Target 600-1000 words
6. Make it suitable for AI models to reference and cite

Format in clean Markdown.`;

  return await callGroq(prompt);
}
```

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ ClientDashboard │  │useClientDashboard│  │   localStorage  │ │
│  │   (UI/Views)    │←→│    (Logic)       │←→│   (Persistence) │ │
│  └─────────────────┘  └────────┬────────┘  └─────────────────┘ │
└────────────────────────────────┼────────────────────────────────┘
                                 │ HTTP POST
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                      │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │    geo-audit    │  │ generate-content │                      │
│  │  (Main API)     │  │   (AI Content)   │                      │
│  └────────┬────────┘  └────────┬────────┘                      │
└───────────┼────────────────────┼────────────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL APIs                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   DataForSEO    │  │   DataForSEO    │  │      Groq       │ │
│  │  (Google SERP)  │  │ (AI Overview)   │  │  (Llama 3.1)    │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Structure

```
ClientDashboard.tsx
├── Header
│   ├── Client Selector (dropdown)
│   ├── Client Actions (edit/delete)
│   ├── Cost Display
│   └── Run Audit Button
│
├── Model & Cost Bar
│   └── Selected models with costs
│
├── Tabs
│   ├── Summary Tab
│   │   ├── Metric Cards (SOV, Rank, Citations, Cost)
│   │   ├── Visibility by Model
│   │   ├── Competitor Gap Chart
│   │   ├── Top Sources
│   │   └── Insights
│   │
│   ├── Prompts Tab
│   │   ├── Add Prompt Input
│   │   ├── AI Prompt Generator
│   │   ├── Bulk Add
│   │   └── Prompts Table
│   │
│   ├── Citations Tab
│   │   ├── All Citations Table
│   │   └── Citation Stats
│   │
│   ├── Content Tab
│   │   ├── Topic Input
│   │   ├── Content Type Selector
│   │   └── Generated Content Display
│   │
│   └── Sources Tab
│       └── Domain/URL List
│
└── Dialogs
    ├── Add Client
    ├── Edit Client
    ├── Import Data
    └── Prompt Detail Modal
```

### State Management

The `useClientDashboard` hook manages all state:

```typescript
// Core State
clients: Client[]              // All clients
selectedClient: Client | null  // Currently selected
prompts: Prompt[]              // Client's prompts
auditResults: AuditResult[]    // Audit results
summary: DashboardSummary      // Aggregated metrics
sourceSummary: SourceSummary[] // Citation sources
costBreakdown: CostBreakdown   // Cost tracking

// UI State
selectedModels: string[]       // Active AI models
loading: boolean               // Global loading
loadingPromptId: string | null // Per-prompt loading
error: string | null           // Error message
```

### Data Persistence

All data is stored in localStorage with these keys:

```typescript
const STORAGE_KEYS = {
  RESULTS: "forzeo_audit_results_v2",   // Audit results per client
  CLIENTS: "forzeo_clients_v2",         // Client configurations
  PROMPTS: "forzeo_prompts_v2",         // Prompts per client
  SELECTED_CLIENT: "forzeo_selected_client",
  SELECTED_MODELS: "forzeo_selected_models",
};
```

Data structure:
```json
{
  "forzeo_clients_v2": [
    { "id": "1", "name": "Juleo", ... }
  ],
  "forzeo_prompts_v2": {
    "1": [{ "id": "p1", "prompt_text": "...", ... }]
  },
  "forzeo_audit_results_v2": {
    "1": [{ "id": "r1", "prompt_id": "p1", ... }]
  }
}
```

---

## Backend Architecture

### geo-audit Function

The main API endpoint that orchestrates all AI queries.

#### Request Flow

```
1. Receive POST request with:
   - prompt_text: Search query
   - brand_name: Brand to detect
   - brand_tags: Alternative names
   - competitors: Competitor brands
   - location_code: Geographic target
   - models: Which AI models to query

2. Query AI models in parallel:
   ├── Google SERP (DataForSEO)
   ├── Google AI Overview (DataForSEO)
   └── Groq Llama 3.1

3. Parse each response:
   ├── Detect brand mentions
   ├── Find brand rank in lists
   ├── Analyze sentiment
   ├── Extract citations
   └── Find competitor mentions

4. Aggregate results:
   ├── Calculate Share of Voice
   ├── Average rank across models
   ├── Combine citations
   └── Sum costs

5. Return structured response
```

#### API Endpoints Used

**DataForSEO SERP**
```
POST https://api.dataforseo.com/v3/serp/google/organic/live/advanced
Body: [{
  keyword: "Best dating apps India 2025",
  location_code: 2356,
  language_code: "en",
  device: "desktop",
  depth: 30
}]
```

**DataForSEO AI Overview**
```
POST https://api.dataforseo.com/v3/serp/google/ai_overview/live/advanced
Body: [{
  keyword: "Best dating apps India 2025",
  location_code: 2356,
  language_code: "en",
  device: "desktop"
}]
```

**Groq Llama**
```
POST https://api.groq.com/openai/v1/chat/completions
Body: {
  model: "llama-3.1-8b-instant",
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "Best dating apps India 2025" }
  ],
  temperature: 0.7,
  max_tokens: 2048
}
```

#### Response Structure

```typescript
{
  success: true,
  data: {
    prompt_text: "Best dating apps India 2025",
    brand_name: "Juleo",
    summary: {
      share_of_voice: 67,        // % of models mentioning brand
      average_rank: 2.5,         // Average position in lists
      total_models_checked: 3,
      visible_in: 2,             // Models where brand appeared
      total_citations: 15,
      total_cost: 0.005
    },
    model_results: [
      {
        model: "google_serp",
        model_name: "Google SERP",
        success: true,
        brand_mentioned: true,
        brand_mention_count: 3,
        brand_rank: 2,
        brand_sentiment: "positive",
        citations: [...],
        api_cost: 0.002
      },
      // ... more models
    ],
    top_sources: [
      { domain: "example.com", count: 5 }
    ],
    top_competitors: [
      { name: "Bumble", total_mentions: 8, avg_rank: 1 }
    ]
  }
}
```

### generate-content Function

Generates GEO-optimized content using Groq.

#### Request

```typescript
{
  prompt: "Write an article about best dating apps...",
  systemPrompt: "You are an expert content writer...",
  type: "article" | "listicle" | "comparison" | "guide" | "faq"
}
```

#### Response

```typescript
{
  response: "# Best Dating Apps in India 2025\n\n...",
  type: "article",
  generatedAt: "2025-12-29T10:00:00Z"
}
```

---

## Data Models

### Client

```typescript
interface Client {
  id: string;
  name: string;              // Display name
  brand_name: string;        // Primary brand to detect
  brand_tags: string[];      // Alternative names
  slug: string;              // URL-safe identifier
  target_region: string;     // e.g., "India"
  location_code: number;     // DataForSEO code
  industry: string;          // Industry preset
  competitors: string[];     // Competitor brands
  primary_color: string;     // UI color
  created_at: string;
  is_default?: boolean;
}
```

### Prompt

```typescript
interface Prompt {
  id: string;
  client_id: string;
  prompt_text: string;       // The search query
  category: string;          // "default" | "custom" | "imported"
  is_custom: boolean;
  is_active: boolean;
}
```

### AuditResult

```typescript
interface AuditResult {
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
  top_sources: Array<{ domain: string; count: number }>;
  top_competitors: Array<{ name: string; total_mentions: number; avg_rank: number | null }>;
  created_at: string;
}
```

### ModelResult

```typescript
interface ModelResult {
  model: string;             // "google_serp" | "google_ai_overview" | "groq_llama"
  model_name: string;        // Display name
  provider: string;          // "DataForSEO" | "Groq"
  color: string;             // UI color
  success: boolean;
  error?: string;
  raw_response: string;      // Full API response
  response_length: number;
  brand_mentioned: boolean;
  brand_mention_count: number;
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
  api_cost: number;
}
```

### Citation

```typescript
interface Citation {
  url: string;
  title: string;
  domain: string;
  position?: number;
  snippet?: string;
}
```

---

## Key Algorithms

### Brand Detection

```typescript
function parseBrandData(response: string, brandName: string, brandTags: string[]) {
  const lower = response.toLowerCase();
  const allTerms = [brandName, ...brandTags];
  let totalCount = 0;
  const matchedTerms: string[] = [];
  
  // Count all mentions of brand and tags
  for (const term of allTerms) {
    const termLower = term.toLowerCase();
    let idx = 0, count = 0;
    while ((idx = lower.indexOf(termLower, idx)) !== -1) {
      count++;
      idx++;
    }
    if (count > 0) {
      totalCount += count;
      matchedTerms.push(term);
    }
  }
  
  // Find rank in numbered lists
  let rank: number | null = null;
  for (const line of response.split('\n')) {
    const match = line.match(/^\s*(\d+)[.)\]]\s*\*{0,2}(.+)/);
    if (match) {
      for (const term of allTerms) {
        if (match[2].toLowerCase().includes(term.toLowerCase())) {
          rank = parseInt(match[1]);
          break;
        }
      }
      if (rank) break;
    }
  }
  
  return { mentioned: totalCount > 0, count: totalCount, rank, matchedTerms };
}
```

### Sentiment Analysis

```typescript
function analyzeSentiment(context: string): "positive" | "neutral" | "negative" {
  const lower = context.toLowerCase();
  
  const positiveWords = ["best", "top", "excellent", "recommended", "leading", 
                         "trusted", "popular", "great", "amazing", "reliable", "safe"];
  const negativeWords = ["avoid", "poor", "worst", "bad", "unreliable", 
                         "scam", "fake", "terrible", "issues", "problems"];
  
  const pos = positiveWords.filter(w => lower.includes(w)).length;
  const neg = negativeWords.filter(w => lower.includes(w)).length;
  
  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}
```

### Share of Voice Calculation

```typescript
// SOV = (models where brand mentioned / total successful models) × 100
const successfulResults = results.filter(r => r.success);
const visibleCount = successfulResults.filter(r => r.brand_mentioned).length;
const shareOfVoice = Math.round((visibleCount / successfulResults.length) * 100);
```

---

## Cost Tracking

### Per-Model Costs

| Model | Cost per Query |
|-------|----------------|
| Google SERP | $0.002 |
| Google AI Overview | $0.003 |
| Groq Llama | $0.000 (free) |

### Cost Calculation

```typescript
// In frontend hook
const updateCostBreakdown = (results: AuditResult[]) => {
  const breakdown = { total: 0, by_model: {}, by_prompt: {} };
  
  for (const result of results) {
    const promptCost = result.summary.total_cost || 0;
    breakdown.total += promptCost;
    breakdown.by_prompt[result.prompt_text] = promptCost;
    
    for (const mr of result.model_results) {
      if (!breakdown.by_model[mr.model]) breakdown.by_model[mr.model] = 0;
      breakdown.by_model[mr.model] += mr.api_cost || 0;
    }
  }
  
  return breakdown;
};
```

---

## Security Considerations

### API Keys

- All API keys stored in Supabase Edge Function secrets
- Never exposed to frontend
- Use environment variables in production

### CORS

Edge functions include CORS headers:
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
```

### Data Privacy

- Client data stored in browser localStorage
- No PII sent to external APIs
- Prompts are search queries, not personal data

---

## Performance Optimizations

### Parallel API Calls

All AI models are queried simultaneously:
```typescript
const promises = [];
if (models.includes("google_serp")) promises.push(getGoogleSERP(...));
if (models.includes("google_ai_overview")) promises.push(getGoogleAIOverview(...));
if (models.includes("groq_llama")) promises.push(getGroqResponse(...));
await Promise.all(promises);
```

### Caching

- Results cached in localStorage per client
- Re-running same prompt replaces old result
- Clear results manually if needed

### Lazy Loading

- Only load prompts/results for selected client
- Switch client triggers new data load
