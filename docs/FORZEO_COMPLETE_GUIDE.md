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
7. [Citation & Source Tracking](#citation--source-tracking)
8. [Reports & Exports](#reports--exports)
9. [Settings & Configuration](#settings--configuration)
10. [Enterprise Features](#enterprise-features)
11. [API & Integrations](#api--integrations)
12. [Technical Architecture](#technical-architecture)

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

### Supported AI Platforms

| Platform | Description | Analysis Type |
|----------|-------------|---------------|
| ChatGPT | OpenAI's conversational AI | Response simulation + Judge-LLM |
| Gemini | Google's AI assistant | Response simulation + Judge-LLM |
| Claude | Anthropic's AI assistant | Response simulation + Judge-LLM |
| Perplexity | AI-powered search engine | Response simulation + Judge-LLM |

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
| `send-alert-email` | Email notifications |
| `send-weekly-report` | Scheduled reports |
| `scheduled-analysis` | Automated analysis |
| `batch-analysis` | Bulk prompt analysis |

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
