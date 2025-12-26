# FORZEO - AI Visibility Intelligence Platform

> **Know exactly how AI sees your brand.**

FORZEO monitors your brand's presence across ChatGPT, Gemini, Claude, and Perplexity. When users ask AI assistants about your industry, FORZEO tells you if you're being mentioned, how you're positioned, and what to do about it.

![FORZEO Dashboard](https://via.placeholder.com/800x400?text=FORZEO+Dashboard)

## 🎯 Why FORZEO?

AI assistants are becoming the new search engines. When someone asks ChatGPT "What's the best CRM for startups?", is your brand in the answer? FORZEO answers that question with data.

**Key Metrics We Track:**
- 📊 **AI Visibility Score** - How often AI mentions your brand (0-100%)
- 🎯 **Brand Ranking** - Your position in AI responses vs competitors
- 💬 **Sentiment Analysis** - Is AI speaking positively about you?
- 🔗 **Citation Tracking** - Which sources AI cites when mentioning you
- 🏆 **Share of Voice** - Your mentions vs competitor mentions

## ✨ Features at a Glance

| Feature | Description |
|---------|-------------|
| **Quick Analysis** | Enter any prompt, get instant visibility score |
| **Multi-Model Tracking** | ChatGPT, Gemini, Claude, Perplexity |
| **Persona Simulation** | See how CTOs, Developers, Students perceive you |
| **War Room** | Real-time feed of all analysis jobs |
| **Competitor Intel** | Head-to-head visibility comparisons |
| **Citation Verification** | Detect AI hallucinations about your brand |
| **AI-Powered Reports** | Executive summaries with recommendations |
| **SERP Integration** | Google search position alongside AI visibility |

## 📖 Documentation

**[→ Complete Feature Guide](docs/FORZEO_COMPLETE_GUIDE.md)** - Every feature explained in detail

**[→ Enterprise Features](docs/ENTERPRISE_FEATURES.md)** - RBAC, scoring versions, job queues

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- Supabase account (free tier works)

### 2. Clone & Install
```bash
git clone <your-repo-url>
cd forzeo
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your keys:
```env
VITE_SUPABASE_URL="your-supabase-url"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
GROQ_API_KEY="your-groq-key"
SERPER_API_KEY="your-serper-key"
```

### 4. Set Up Database
```bash
npx supabase db push
```

### 5. Deploy Edge Functions
```bash
npx supabase functions deploy --project-ref YOUR_PROJECT_REF
```

### 6. Configure Secrets in Supabase
Go to Supabase Dashboard → Settings → Edge Functions → Secrets:
- `GROQ_API_KEY`
- `SERPER_API_KEY`

### 7. Start Development
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 🔑 API Keys (All Free Tiers Available)

| Service | Purpose | Free Tier | Get Key |
|---------|---------|-----------|---------|
| **Groq** | LLM (Llama 3.1) | 14,400 req/day | [console.groq.com](https://console.groq.com) |
| **Serper** | Google SERP | 2,500/month | [serper.dev](https://serper.dev) |
| **Gemini** | Fallback LLM | 60 req/min | [aistudio.google.com](https://aistudio.google.com) |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│         Vite + TypeScript + Tailwind + shadcn/ui            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  PostgreSQL │  │ 26 Edge     │  │    Auth     │         │
│  │  + RLS      │  │ Functions   │  │  + RBAC     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Groq API      │ │   Serper API    │ │   Gemini API    │
│  (Primary LLM)  │ │  (SERP Data)    │ │  (Fallback)     │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## 📁 Project Structure

```
forzeo/
├── src/
│   ├── pages/              # Route pages
│   │   ├── Index.tsx       # Dashboard with quick search
│   │   ├── Prompts.tsx     # Prompt tracking & analysis
│   │   ├── WarRoom.tsx     # Live operations feed
│   │   ├── Reports.tsx     # Report generation
│   │   ├── Sources.tsx     # Citation tracking
│   │   └── Settings.tsx    # Configuration
│   ├── components/         # UI components
│   ├── hooks/              # React hooks
│   └── lib/                # Utilities
├── supabase/
│   ├── functions/          # 26 Edge Functions
│   └── migrations/         # Database schema
├── docs/
│   ├── FORZEO_COMPLETE_GUIDE.md
│   └── ENTERPRISE_FEATURES.md
└── .env.example
```

## 🔧 Key Edge Functions

| Function | Purpose |
|----------|---------|
| `analyze-prompt` | Main analysis with Judge-LLM |
| `serp-search` | Google SERP via Serper |
| `generate-report` | AI-powered reports |
| `scoring-engine` | Visibility score calculation |
| `mention-detector` | Brand mention detection |
| `verify-citation` | Hallucination detection |
| `job-processor` | Background job queue |

## 🚢 Deployment

### Frontend → Netlify/Vercel
```bash
npm run build
# Deploy dist/ folder
```

### Backend → Supabase
```bash
# Push migrations
npx supabase db push --project-ref YOUR_REF

# Deploy all functions
npx supabase functions deploy --project-ref YOUR_REF
```

## 📊 Scoring Algorithm

```yaml
AI Visibility Score (AVS):
  - Mention Weight: 40%
  - Citation Weight: 30%
  - Sentiment Weight: 20%
  - Rank Weight: 10%

Adjustments:
  - Position bonus: Higher rank = higher score
  - Competitor penalty: More competitors = lower share
  - Engine authority: Unreliable engines weighted less
```

## 🔐 Security

- Row Level Security (RLS) on all tables
- JWT authentication via Supabase Auth
- API keys stored as encrypted secrets
- CORS protection on all endpoints

## 📈 Roadmap

- [ ] Slack/Teams integration
- [ ] Webhook notifications
- [ ] Custom AI model support
- [ ] White-label option
- [ ] API access for developers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file

---

**Built with ❤️ for the AI-first era**
