# Forzeo Client Dashboard - AI Visibility Analytics

A production-ready multi-tenant SaaS dashboard for tracking brand visibility across AI search engines.

> "Forzeo does not query LLMs. It monitors how LLMs already talk about you."

## 🎯 What This Does

This dashboard helps brands understand how visible they are when users ask AI assistants questions like:
- "Best dating apps in India 2025"
- "Top dental clinics in Surrey UK"
- "Affordable fashion stores online"

It uses DataForSEO's LLM Mentions API to search their database of AI-generated answers and analyze:
- **Share of Voice (SOV)** - % of responses mentioning your brand
- **Visibility Score** - Weighted score based on mentions + citations
- **Trust Index** - Citation authority vs mere mentions
- **Rank Position** - Where your brand appears in AI-generated lists
- **Competitor Analysis** - How competitors compare

## 📁 Project Structure

```
client-dashboard/
├── README.md                    # This file
├── SETUP.md                     # Detailed setup instructions
├── ARCHITECTURE.md              # System architecture & scoring formulas
│
├── frontend/                    # React + TypeScript frontend
│   ├── ClientDashboard.tsx      # Main dashboard component
│   ├── useClientDashboard.ts    # React hook with all logic
│   └── types.ts                 # TypeScript interfaces
│
├── backend/                     # Supabase Edge Functions
│   ├── geo-audit/
│   │   └── index.ts             # Main API endpoint (LLM Mentions + SERP)
│   └── generate-content/
│       └── index.ts             # Content generation API
│
└── database/                    # Database schema
    └── schema.sql               # Multi-tenant tables
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account (free tier works)
- DataForSEO account (for LLM Mentions API)

### 1. Clone & Install
```bash
npm install
```

### 2. Set Environment Variables
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Deploy Supabase Functions
```bash
npx supabase functions deploy geo-audit --project-ref YOUR_PROJECT_REF
```

### 4. Start Development Server
```bash
npm run dev
# Open http://localhost:8082/clients
```

## 🔌 Available AI Models

| Model ID | Name | Description | Cost/Query |
|----------|------|-------------|------------|
| `llm_mentions` | LLM Mentions | Searches DataForSEO's AI answer database | $0.10 |
| `google_ai_overview` | Google AI Overview | Direct Google AI Overview results | $0.003 |
| `google_serp` | Google SERP | Traditional search results | $0.002 |

## 📊 Key Metrics

### Share of Voice (SOV)
```
SOV = (Models where brand mentioned / Total successful models) × 100
```

### Visibility Score
Weighted score based on:
- Mentioned = 50 points
- Cited (linked) = 100 points
- Rank bonus = up to 30 points
- Mention count bonus = up to 20 points

### Trust Index
```
Trust = (Citation Rate × 0.6) + (Authority Rate × 0.4)
```

## 🏢 Pilot Clients

1. **Juleo Club** (India, location_code: 2356) - Dating/Matrimony
2. **Jagota** (Thailand, location_code: 2764) - Food/Beverage  
3. **Post House Dental** (Surrey UK, location_code: 2826) - Healthcare
4. **Shoptheyn** (India, location_code: 2356) - E-commerce/Fashion

## 📖 Documentation

- [SETUP.md](./SETUP.md) - Detailed setup instructions & metrics interpretation
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical documentation & scoring formulas

## 🔗 API Endpoint

### GEO Audit
```bash
POST /functions/v1/geo-audit
Content-Type: application/json

{
  "prompt_text": "best dating apps in India 2025",
  "brand_name": "Juleo",
  "brand_domain": "juleo.club",
  "brand_tags": ["Juleo Club"],
  "competitors": ["Bumble", "Hinge", "Tinder"],
  "location_code": 2356,
  "models": ["llm_mentions", "google_ai_overview"]
}
```

### Response
```json
{
  "success": true,
  "data": {
    "summary": {
      "share_of_voice": 50,
      "visibility_score": 75,
      "trust_index": 60,
      "average_rank": 2.5,
      "total_cost": 0.103
    },
    "model_results": [...],
    "top_sources": [...],
    "top_competitors": [...]
  }
}
```
