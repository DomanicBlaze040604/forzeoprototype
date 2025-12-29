# Forzeo Client Dashboard - AI Visibility Analytics

A production-ready multi-tenant SaaS dashboard for tracking brand visibility across AI search engines (ChatGPT, Google AI Overview, Perplexity, etc.).

## 🎯 What This Does

This dashboard helps brands understand how visible they are when users ask AI assistants questions like:
- "Best dating apps in India 2025"
- "Top dental clinics in Surrey UK"
- "Affordable fashion stores online"

It queries multiple AI models and analyzes:
- **Share of Voice (SOV)** - % of responses mentioning your brand
- **Rank Position** - Where your brand appears in AI-generated lists
- **Citations** - Which sources AI models reference
- **Competitor Analysis** - How competitors compare

## 📁 Project Structure

```
client-dashboard/
├── README.md                    # This file
├── SETUP.md                     # Detailed setup instructions
├── ARCHITECTURE.md              # System architecture & data flow
│
├── frontend/                    # React + TypeScript frontend
│   ├── ClientDashboard.tsx      # Main dashboard component
│   ├── useClientDashboard.ts    # React hook with all logic
│   └── types.ts                 # TypeScript interfaces
│
├── backend/                     # Supabase Edge Functions
│   ├── geo-audit/
│   │   └── index.ts             # Main API endpoint
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
- DataForSEO account (for AI search data)
- Groq account (free - for AI responses)

### 1. Clone & Install
```bash
# Copy these files to your React project
cp -r client-dashboard/frontend/* src/
cp -r client-dashboard/backend/* supabase/functions/
```

### 2. Environment Variables
```bash
# In Supabase Dashboard → Settings → Edge Functions → Secrets
DATAFORSEO_LOGIN=your-email@example.com
DATAFORSEO_PASSWORD=your-password
GROQ_API_KEY=your-groq-key  # Free at console.groq.com
```

### 3. Deploy Backend
```bash
npx supabase functions deploy geo-audit --no-verify-jwt
npx supabase functions deploy generate-content --no-verify-jwt
```

### 4. Run Frontend
```bash
npm run dev
# Visit http://localhost:5173/clients
```

## 💰 API Costs

| Service | Cost | Free Tier |
|---------|------|-----------|
| DataForSEO SERP | ~$0.002/query | $1 credit on signup |
| DataForSEO AI Overview | ~$0.003/query | Included |
| Groq (Llama 3.1) | Free | 14,400 req/day |

**Typical audit cost**: ~$0.005 per prompt (3 models)

## 🔑 Key Features

### Multi-Tenant Client Management
- Add/edit/delete clients
- Industry presets with default competitors
- Per-client data isolation via localStorage

### Unlimited Prompts
- Add single or bulk prompts
- Import from JSON, CSV, or plain text
- AI-powered prompt generation from keywords

### Real-Time Analysis
- Query 3 AI models simultaneously
- Live progress tracking
- Per-prompt cost display

### Comprehensive Reports
- Export as formatted text document
- CSV export for spreadsheets
- Full citation list with URLs

### Content Generation
- Generate GEO-optimized content
- Multiple content types (article, listicle, guide, FAQ)
- Copy/download generated content

## 📊 Data Flow

```
User clicks "Run Audit"
        ↓
Frontend calls geo-audit Edge Function
        ↓
Edge Function queries:
  ├── DataForSEO SERP API (Google results)
  ├── DataForSEO AI Overview API
  └── Groq Llama 3.1 API
        ↓
Responses parsed for:
  ├── Brand mentions & sentiment
  ├── Competitor mentions
  ├── Rank in lists
  └── Citation URLs
        ↓
Results returned to frontend
        ↓
Saved to localStorage (per-client)
        ↓
Dashboard updated with metrics
```

## 📈 Scoring Formulas

### Share of Voice (SOV)
```
SOV = (Models mentioning brand / Total models) × 100

Example: 2 out of 3 models mention brand → SOV = 67%
```

| SOV Range | Interpretation |
|-----------|----------------|
| 70-100% | Excellent - Brand dominates |
| 50-69% | Good - Appears in most responses |
| 25-49% | Moderate - Room for improvement |
| 0-24% | Low - Urgent optimization needed |

### Brand Rank
```
Detected from numbered lists in AI responses:
"1. Bumble" → Rank 1
"2. Juleo" → Rank 2
"3. Tinder" → Rank 3

Average Rank = Sum of ranks / Models with rank
```

### Sentiment Analysis
```
Positive: "best", "top", "recommended", "trusted", "reliable"
Negative: "avoid", "poor", "worst", "scam", "issues"

Context: 100 chars before/after brand mention
```

### Winner Detection
```
1. Rank #1 always wins
2. Otherwise: Most mentions wins
3. Tie-breaker: Better rank wins
```

See `ARCHITECTURE.md` for complete algorithm documentation.

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase Edge Functions (Deno)
- **APIs**: DataForSEO, Groq
- **Storage**: localStorage (can upgrade to Supabase DB)

## 📝 License

MIT - Use freely for commercial projects.

## 🤝 Support

For questions or issues, check ARCHITECTURE.md for detailed technical documentation.
