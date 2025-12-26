# FORZEO - AI Visibility Intelligence Platform

## Complete Feature Guide

FORZEO is an enterprise-grade AI visibility monitoring platform that helps brands understand and optimize their presence across AI-powered search engines and language models. This document covers every feature, how it works, and how to use it.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Core Features](#core-features)
3. [Dashboard & Analytics](#dashboard--analytics)
4. [Prompt Analysis](#prompt-analysis)
5. [War Room - Live Operations](#war-room---live-operations)
6. [Competitor Intelligence](#competitor-intelligence)
7. [Gap Analysis](#gap-analysis-new) (NEW)
8. [Content Generation](#content-generation-new) (NEW)
9. [LLM Traffic Analytics](#llm-traffic-analytics-new) (NEW)
10. [Citation & Source Tracking](#citation--source-tracking)
11. [Reports & Exports](#reports--exports)
12. [Settings & Configuration](#settings--configuration)
13. [Enterprise Features](#enterprise-features)
14. [API & Integrations](#api--integrations)
15. [Technical Architecture](#technical-architecture)

---

## Platform Overview

### What is FORZEO?

FORZEO monitors how AI models (ChatGPT, Gemini, Claude, Perplexity) respond to queries about your brand. When users ask AI assistants questions like "What's the best CRM software?" or "Top marketing tools for startups", FORZEO tracks whether your brand is mentioned, how it's positioned, and what sentiment is expressed.

### Key Value Propositions

- **AI Visibility Score**: Know exactly how visible your brand is across AI platforms
- **Competitive Intelligence**: See how you stack up against competitors in AI responses
- **Sentiment Analysis**: Understand if AI models speak positively or negatively about your brand
- **Citation Tracking**: Know which sources AI models cite when mentioning your brand
- **Actionable Insights**: Get recommendations to improve your AI visibility
- **Real AI Responses**: Get actual responses from AI engines via DataForSEO integration

### Supported AI Platforms

| Platform | Description | Analysis Type |
|----------|-------------|---------------|
| ChatGPT | OpenAI's conversational AI | Real scraping (DataForSEO) or simulation |
| Gemini | Google's AI assistant | Real scraping (DataForSEO) or simulation |
| Claude | Anthropic's AI assistant | Real scraping (DataForSEO) or simulation |
| Perplexity | AI-powered search engine | Real scraping (DataForSEO) or simulation |

### Data Sources & Automatic Fallback

FORZEO uses a smart dual-source system:

**Primary: DataForSEO (when available)**
- Real AI engine responses via LLM Scraper API
- Actual SERP data from Google
- Keyword research and search volume data
- Domain analytics and backlinks
- Content sentiment analysis

**Fallback: Groq + Serper (automatic)**
- When DataForSEO balance is exhausted (<$1)
- Groq AI simulates AI model responses
- Serper provides SERP data
- Seamless transition - no user action needed

The system automatically checks DataForSEO balance and switches to fallback mode when needed, ensuring uninterrupted service.

---

## Core Features

### 1. Quick Search & Analysis (Dashboard)

**Location**: Dashboard header search bar

**How it works**:
1. Enter any prompt/question in the search bar (e.g., "Best project management tools")
2. Click "Analyze" or press Enter
3. FORZEO queries all 4 AI models simultaneously
4. Judge-LLM analyzes each response for brand mentions
5. Results display instantly with visibility score

**What you get**:
- Overall visibility score (0-100%)
- Per-model breakdown (mentioned/not mentioned)
- Sentiment analysis (positive/neutral/negative)
- Brand ranking position in each response
- Competitors mentioned in responses
- Actionable recommendations

### 2. Brand Management

**Location**: Settings → Brands

**Features**:
- Add multiple brands to track
- Set brand aliases (e.g., "FORZEO", "Forzeo AI", "forzeo.com")
- Configure brand domains for citation tracking
- Set active brand for dashboard context
- Track brand-specific metrics over time

### 3. Multi-Persona Analysis

**Location**: Prompts page → Persona selector

**Available Personas**:
| Persona | Focus Areas |
|---------|-------------|
| General | Standard search behavior |
| CTO | Enterprise, scalability, security, integration |
| Developer | DX, documentation, API design, community |
| Student | Free tiers, learning resources, ease of use |
| Investor | Market position, growth, competitive moat |
| Manager | Collaboration, onboarding, reporting |

**How it works**:
- Select a persona before analyzing
- AI models respond as if queried by that persona type
- Results show persona-specific visibility
- Compare how different audiences perceive your brand

### 4. Geographic Analysis

**Location**: Prompts page → Country selector

**Supported Countries**: US, UK, Canada, Australia, Germany, France, Spain, Italy, Brazil, Mexico, Japan, India, Netherlands

**How it works**:
- Select target country for analysis
- SERP results localized to that region
- AI responses contextualized for local market
- Track regional visibility differences

---

## Dashboard & Analytics

### Main Dashboard

**Location**: Home page (/)

**Metrics Displayed**:

1. **Brand Visibility** (0-100%)
   - Aggregate score across all AI models
   - Calculated from mention frequency, position, and sentiment
   - Trend indicator showing week-over-week change

2. **Total Mentions**
   - Count of times brand appeared in AI responses
   - Across all tracked prompts and models
   - Month-over-month comparison

3. **Sentiment**
   - Overall sentiment classification (Positive/Neutral/Negative)
   - Percentage breakdown of positive mentions
   - Based on Judge-LLM sentiment analysis

4. **Competitor Gap**
   - Your share of voice vs. market leader
   - Positive = ahead, Negative = behind
   - Calculated from comparative analysis

### Visibility Trend Chart

**What it shows**:
- 30-day visibility score history
- Daily data points with smooth curve
- Hover for exact values
- Identify trends and anomalies

### Competitive Dominance Radar

**Metrics compared**:
- Visibility (brand presence score)
- Sentiment (positive mention ratio)
- Mentions (total mention count)
- Ranking (average position in responses)

**How to read**:
- Your brand = filled area
- Competitors = outline
- Larger area = better performance

### Share of Voice Chart

**What it shows**:
- Pie chart of brand mentions vs. competitors
- Your percentage of total AI mentions
- Click segments for detailed breakdown

---

## Prompt Analysis

### Tracked Prompts

**Location**: Prompts page (/prompts)

**Features**:

1. **Add Single Prompt**
   - Click "Add Prompt"
   - Enter prompt text
   - Optional: Add tag for categorization
   - Auto-analyzes upon creation

2. **Bulk Import (CSV)**
   - Click "Bulk Import CSV"
   - Download template for format
   - Upload CSV with columns: text, tag, location_country
   - Auto-analyzes first 5 prompts

3. **Prompt Table**
   - View all tracked prompts
   - Sort by visibility, date, or tag
   - Filter by search query
   - See per-model mention indicators

4. **Re-analyze**
   - Click "Analyze" on any prompt
   - Runs fresh analysis with current AI responses
   - Updates visibility score and results

5. **SERP History**
   - Click history icon on any prompt
   - View Google SERP position over time
   - Track organic ranking changes

### Analysis Results Panel

**Displayed after analysis**:

1. **Model Cards** (4 cards, one per AI)
   - Model name with color indicator
   - Mentioned/Not mentioned status
   - Rank position if mentioned
   - Sentiment badge
   - Response snippet preview
   - Competitors mentioned in response

2. **SERP Data**
   - Brand in Google SERP (Yes/No)
   - SERP position (#1-10 or Not ranked)
   - Competitor SERP positions
   - Top organic results with links

### Prompt Suggestions

**Location**: Prompts page (sidebar or suggestions panel)

**How it works**:
- AI generates relevant prompts for your industry
- Based on your brand and competitors
- Click to add and auto-analyze
- Helps discover new tracking opportunities

---

## War Room - Live Operations

**Location**: War Room page (/war-room)

### Real-Time Analysis Feed

**What it shows**:
- Live stream of all analysis jobs
- Real-time WebSocket updates
- Job phases: Pending → Scraping → Thinking → Judging → Complete

**Job Information**:
- Prompt text being analyzed
- AI model being queried
- Persona used for analysis
- Current phase with animated indicator
- Final result (brand mentioned, sentiment, accuracy)

### Active Personas Panel

- Shows which personas are currently running analyses
- Count of active jobs per persona
- Visual indicators for busy personas

### Statistics Bar

- **Wins**: Analyses where brand was mentioned
- **Losses**: Analyses where brand was not mentioned
- **In Progress**: Currently running analyses

### Controls

- **Pause/Resume**: Freeze the live feed
- **Clear**: Remove all completed jobs from view

---

## Competitor Intelligence

### Competitor Management

**Location**: Settings → Competitors

**Features**:
- Add competitors by name
- Set competitor aliases
- Track competitor domains
- Enable/disable tracking per competitor
- View competitor visibility scores

### Competitor Analysis Page (NEW)

**Location**: Competitors page (/competitors)

**Features**:
- **Summary Cards**: Your SOV, Leader SOV, Gap to Leader, Competitors Tracked
- **Competitive SOV & Mentions Chart**: Horizontal bar chart comparing all brands
- **Sentiment Breakdown Chart**: Stacked bar showing positive/neutral/negative sentiment
- **Gap Analysis Table**: Detailed comparison with Gap to Leader column

**Metrics Compared**:
| Metric | Description |
|--------|-------------|
| Share of Voice | % of AI responses mentioning brand |
| Total Mentions | Absolute mention count |
| Avg List Rank | Average position in AI lists |
| Positive Sentiment | % of positive mentions |
| Gap to Leader | Difference from top competitor |

### Competitor Benchmarking

**Location**: Dashboard → Competitor Radar

**Metrics Compared**:
- Visibility score
- Mention frequency
- Sentiment ratio
- Average ranking
- Citation frequency

### Competitor in Analysis

**During prompt analysis**:
- See which competitors are mentioned
- Compare your rank vs. competitor ranks
- Identify prompts where competitors dominate
- Get recommendations to outperform competitors

---

## Gap Analysis (NEW)

### Content Gap Analysis Page

**Location**: Gap Analysis page (/gap-analysis)

**Purpose**: Identify prompts where your brand doesn't appear in AI responses

**Features**:
- **Gap Prompts List**: All prompts where brand wasn't mentioned
- **Estimated Volume**: Search volume for each prompt
- **LLMs Missing**: Which AI models didn't mention your brand
- **Topic Filtering**: Filter by topic category
- **LLM Filtering**: Filter by specific AI model
- **Search**: Find specific prompts

### AI-Generated Content Briefs

**How it works**:
1. Click "Suggested Content" on any gap prompt
2. AI generates a content brief targeting that prompt
3. Brief includes:
   - Suggested title
   - Content description
   - Target keywords
   - Recommended format (listicle, guide, etc.)
4. Copy brief to clipboard

**Use Case**: Create content that addresses gaps in AI visibility

---

## Content Generation (NEW)

### Content Generation Page

**Location**: Content Gen page (/content-gen)

**Purpose**: Generate AI-optimized content to improve visibility

**Features**:

1. **Topic Selection**
   - Choose from preset topics
   - Enter custom topic

2. **Content Type Selection**
   - Blog Post: Informative article with SEO optimization
   - Product Comparison: Side-by-side analysis
   - Listicle: Numbered list format
   - Buyer's Guide: Comprehensive purchasing guide
   - Product Review: In-depth single product review

3. **Model Selection**
   - Groq (Llama 3.1): Fast, free
   - GPT-4: Best quality, premium
   - Claude 3.5: Natural writing, premium

4. **Brand Voice**
   - Professional: Business-appropriate tone
   - Casual: Friendly, conversational
   - Technical: Precise, detailed

5. **Reference URLs**: Add URLs for style/tone reference

### Content History

- All generated content saved locally
- Load previous content
- Delete individual items
- Clear all history

### Generated Content

- Editable in-place
- Copy to clipboard
- Markdown formatted
- Optimized for AI visibility

---

## LLM Traffic Analytics (NEW)

### LLM Traffic Page

**Location**: LLM Traffic page (/llm-traffic)

**Purpose**: Connect analytics to measure AI-driven traffic

**Supported Integrations**:
| Platform | Status | Features |
|----------|--------|----------|
| Google Analytics 4 | UI Ready | Traffic attribution, conversion tracking |
| Adobe Analytics | UI Ready | Advanced segmentation, custom dimensions |
| Segment | UI Ready | Data unification, identity resolution |

**Features Preview**:
- GEO Traffic Funnel: Visualize AI visibility → site visits → conversions
- Attribution Models: Understand which AI engines drive valuable traffic
- ROI Measurement: Calculate business impact of AI visibility
- Traffic Correlation: See how AI mentions correlate with traffic

**Note**: OAuth integration pending - UI is ready for connection

---

## Citation & Source Tracking

### Citation Verification

**Location**: Sources page (/sources)

**How it works**:
1. When AI mentions a source URL, FORZEO captures it
2. Fetches the actual source content
3. Generates embeddings for claim and source
4. Calculates semantic similarity score
5. Determines hallucination risk level

**Verification Statuses**:
| Status | Meaning |
|--------|---------|
| Verified | High similarity, source supports claim |
| Unverified | Low similarity, claim may not match source |
| Not Found | Source URL returns 404 |
| Fetch Error | Could not retrieve source |
| Pending | Awaiting verification |

**Hallucination Risk Levels**:
| Risk | Similarity Score |
|------|-----------------|
| Low | ≥70% |
| Medium | 50-69% |
| High | 30-49% |
| Very High | <30% |

### URL Citation Heatmap

**What it shows**:
- Most frequently cited domains
- Citation frequency by AI model
- Your domain vs. competitor domains
- Click to see specific citations

### Citation History

- Track citations over time
- See which sources AI models prefer
- Identify authoritative sources in your industry

---

## Reports & Exports

### Report Generation

**Location**: Reports page (/reports)

**Report Types**:

1. **Visibility Report**
   - Executive summary
   - Key metrics with trends
   - Detailed analysis
   - Recommendations

2. **Competitor Analysis**
   - Competitive landscape overview
   - Head-to-head comparisons
   - Market positioning insights

3. **Citation Report**
   - Source breakdown
   - Citation frequency analysis
   - Domain authority insights

4. **Full Report**
   - Comprehensive analysis
   - All metrics and insights
   - Strategic recommendations

### Report Contents

Each report includes:
- **Executive Summary**: 2-3 sentence overview
- **Key Metrics**: Visibility, mentions, sentiment, rank with % changes
- **Detailed Analysis**: In-depth performance breakdown
- **Competitor Insights**: Competitive positioning table
- **Recommendations**: Prioritized action items (high/medium/low)
- **Future Outlook**: Predictions and trends

### Export Options

1. **PDF Export**
   - Professional formatted document
   - Print-ready layout
   - Includes all charts and tables

2. **CSV Export**
   - Raw metrics data
   - Import into spreadsheets
   - Custom analysis capability

### Persona Comparison Report

**Location**: Reports → Persona Comparison tab

**What it shows**:
- Visibility scores by persona type
- Which personas see your brand most
- Persona-specific recommendations

---

## Settings & Configuration

### Account Settings

**Location**: Settings page (/settings)

**Sections**:

1. **Profile**
   - Display name
   - Email address
   - Avatar/profile picture

2. **Notifications**
   - Email alerts for visibility changes
   - Weekly report emails
   - Alert thresholds configuration

3. **API Keys**
   - View/regenerate API keys
   - Usage statistics
   - Rate limit information

### Brand Settings

- Brand name and aliases
- Brand domains for citation tracking
- Industry/category selection
- Competitor associations

### Email Reports

- Enable/disable weekly reports
- Set report delivery day
- Choose report type
- Add additional recipients

### Health Check

**Location**: Settings → System Health

**Monitors**:
- Groq AI (LLM) status
- Serper API (SERP) status
- Database connectivity
- Edge function health

---

## Enterprise Features

### Role-Based Access Control (RBAC)

**Roles**:
| Role | Permissions |
|------|-------------|
| Owner | Full access, billing, delete org |
| Admin | Manage users, settings, all features |
| Analyst | View all, create reports, analyze |
| Viewer | Read-only access |

### Organization Management

- Create/manage organizations
- Invite team members
- Assign roles
- View member activity

### Scoring Version Control

**Location**: Settings → Scoring Versions

**Features**:
- Create custom scoring algorithms
- A/B test different scoring weights
- Version history and rollback
- Set active scoring version

**Configurable Weights**:
- Visibility weight (default: 40%)
- Citations weight (default: 30%)
- Sentiment weight (default: 20%)
- Rank weight (default: 10%)

### Engine Authority System

**What it does**:
- Tracks reliability of each AI engine
- Adjusts scoring based on engine health
- Automatic failover for degraded engines
- Historical performance metrics

**Tracked Metrics**:
- Total queries per engine
- Success rate
- Average response time
- Consecutive failures
- Authority weight (0.5-1.5x)

### Cost Tracking

**Location**: Dashboard → API Usage panel

**Tracks**:
- API calls per service
- Estimated costs
- Daily/monthly limits
- Usage trends

### Job Queue System

**Features**:
- Background job processing
- Retry logic with exponential backoff
- Dead letter queue for failed jobs
- Job prioritization
- Batch processing support

### SLA Enforcement

**Monitors**:
- Response time SLAs
- Availability targets
- Automatic alerting
- Performance degradation detection

---

## API & Integrations

### Edge Functions (26 Total)

| Function | Purpose |
|----------|---------|
| `analyze-prompt` | Main analysis with Judge-LLM |
| `serp-search` | Google SERP data via Serper |
| `generate-report` | AI-powered report generation |
| `suggest-prompts` | AI prompt suggestions |
| `health-check` | System health monitoring |
| `verify-citation` | Citation verification |
| `compute-similarity` | Embedding similarity calculation |
| `mention-detector` | Brand mention detection |
| `scoring-engine` | Visibility score calculation |
| `prompt-classifier` | Intent/funnel classification |
| `ai-answer-generator` | Multi-style AI responses |
| `multi-search` | Aggregated search results |
| `analysis-pipeline` | Full analysis orchestration |
| `job-processor` | Background job execution |
| `process-job-queue` | Queue processing |
| `batch-processor` | Bulk operations |
| `engine-authority` | Engine health tracking |
| `insight-prioritizer` | Recommendation prioritization |
| `cost-tracker` | API cost monitoring |
| `trust-analytics` | Trust score calculation |
| `sla-enforcer` | SLA monitoring |
| `dataforseo-client` | DataForSEO integration |
| `dataforseo-enhanced` | Enhanced DataForSEO with fallback |
| `send-alert-email` | Email notifications |
| `send-weekly-report` | Scheduled reports |
| `scheduled-analysis` | Automated analysis |
| `batch-analysis` | Bulk prompt analysis |

---

## DataForSEO Integration

### Overview

FORZEO integrates with DataForSEO to provide real AI engine responses and comprehensive SEO data. When DataForSEO is configured and has sufficient balance, the system uses real data instead of simulations.

### DataForSEO Features Used

| Feature | API Endpoint | Purpose |
|---------|--------------|---------|
| **LLM Scraper** | `/content_generation/llm_scraper` | Get real responses from ChatGPT, Gemini, Claude, Perplexity |
| **LLM Mentions** | `/content_generation/llm_mentions` | Track brand mentions across AI engines |
| **Google AI Mode** | `/serp/google/ai_mode` | Access Google's AI-powered search results |
| **SERP Organic** | `/serp/google/organic` | Real Google search results |
| **Keyword Data** | `/keywords_data/google_ads/search_volume` | Search volume and competition data |
| **Domain Analytics** | `/domain_analytics/overview` | Competitor domain analysis |
| **Backlinks** | `/backlinks/summary` | Domain authority and backlink data |
| **Content Sentiment** | `/content_analysis/sentiment_analysis` | Brand sentiment across the web |

### Automatic Fallback System

The system automatically switches between DataForSEO and fallback services:

```
┌─────────────────────────────────────────────────────────────┐
│                    Analysis Request                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Check DataForSEO Balance                        │
│              (Cached for 60 seconds)                         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
        Balance ≥ $1                    Balance < $1
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│    DataForSEO APIs      │     │    Fallback Services    │
│  • LLM Scraper (real)   │     │  • Groq AI (simulation) │
│  • SERP API (real)      │     │  • Serper (SERP data)   │
│  • Keyword Data         │     │  • Local analysis       │
│  • Domain Analytics     │     │                         │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Analysis Results                          │
│              (includes data_source indicator)                │
└─────────────────────────────────────────────────────────────┘
```

### Status Banner

The dashboard shows a status banner indicating the current data source:

| Status | Color | Meaning |
|--------|-------|---------|
| **Connected** | Green | DataForSEO active, real AI responses |
| **Low Balance** | Amber | Balance < $5, consider adding credits |
| **Fallback Mode** | Amber | Using Groq + Serper simulation |
| **Error** | Red | Connection issue |

### API Response Data Source

Every analysis response includes a `data_source` object:

```json
{
  "data_source": {
    "primary": "dataforseo",
    "dataforseo_balance": 45.23,
    "dataforseo_available": true,
    "models_using_dataforseo": 4,
    "models_using_fallback": 0
  }
}
```

### Cost Estimates

| Action | Estimated Cost |
|--------|----------------|
| Full Analysis (4 engines) | ~$0.10 |
| LLM Scrape (per engine) | ~$0.02 |
| SERP Search | ~$0.003 |
| Keyword Data | ~$0.01 |
| Domain Analysis | ~$0.02 |
| Backlinks | ~$0.02 |
| Sentiment Analysis | ~$0.01 |

### Configuration

DataForSEO is configured via Supabase secrets:

```
DATAFORSEO_AUTH=<base64_encoded_credentials>
```

The base64 credentials are in format: `email:password` encoded to base64.

### External APIs Used

| API | Purpose | Free Tier |
|-----|---------|-----------|
| Groq | LLM (Llama 3.1 8B) | Yes, generous |
| Serper | Google SERP data | 2,500 queries/month |
| Gemini | Fallback LLM | Yes, limited |
| DataForSEO | Advanced SERP (optional) | No |

### Webhooks (Coming Soon)

- Analysis complete notifications
- Visibility change alerts
- Competitor movement alerts

---

## Technical Architecture

### Frontend Stack

- **Framework**: React 18 with TypeScript
- **Routing**: React Router v6
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React hooks + Tanstack Query
- **Animations**: Framer Motion
- **Charts**: Recharts

### Backend Stack

- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Edge Functions**: Deno runtime
- **Real-time**: Supabase Realtime (WebSocket)
- **Storage**: Supabase Storage

### Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `brands` | Brand configurations |
| `competitors` | Competitor tracking |
| `prompts` | Tracked prompts |
| `prompt_results` | Analysis results per model |
| `analysis_jobs` | War Room job tracking |
| `visibility_history` | Historical scores |
| `serp_history` | SERP position history |
| `citation_verifications` | Citation checks |
| `alerts` | User notifications |
| `api_usage` | Cost tracking |
| `job_queue` | Background jobs |
| `engine_authority` | Engine health |
| `scoring_versions` | Scoring configs |

### Security Features

- Row Level Security (RLS) on all tables
- JWT-based authentication
- API key encryption
- CORS protection
- Rate limiting

---

## Getting Started Checklist

1. ☐ Sign up / Log in
2. ☐ Add your brand name and aliases
3. ☐ Add 3-5 competitors
4. ☐ Run your first prompt analysis from dashboard
5. ☐ Add 10+ prompts relevant to your industry
6. ☐ Generate your first visibility report
7. ☐ Set up weekly email reports
8. ☐ Explore the War Room for live analysis
9. ☐ Review citation sources
10. ☐ Implement top recommendations

---

## Support & Resources

- **Documentation**: This guide
- **Health Status**: Settings → System Health
- **Email**: support@forzeo.ai (placeholder)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2025 | Initial release |

---

*FORZEO - Know Your AI Visibility*
