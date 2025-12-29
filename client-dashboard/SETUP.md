# Forzeo Client Dashboard - Setup Guide

Complete setup instructions for deploying the AI Visibility Dashboard.

## Prerequisites

### Required Accounts

1. **Supabase** (Backend hosting)
   - Sign up at https://supabase.com
   - Free tier is sufficient for development
   - Create a new project

2. **DataForSEO** (Search data)
   - Sign up at https://dataforseo.com
   - Get $1 free credit on signup
   - Note your login email and password

3. **Groq** (AI responses)
   - Sign up at https://console.groq.com
   - Completely free (14,400 requests/day)
   - Create an API key

### Development Tools

- Node.js 18+ (https://nodejs.org)
- npm or yarn
- Supabase CLI: `npm install -g supabase`

---

## Step 1: Supabase Project Setup

### 1.1 Create Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Choose organization and name (e.g., "forzeo-dashboard")
4. Set a strong database password
5. Select region closest to your users
6. Wait for project to initialize (~2 minutes)

### 1.2 Get Project Credentials

From your Supabase dashboard:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIs...`

### 1.3 Configure Environment Secrets

1. Go to **Settings** → **Edge Functions**
2. Click **Manage Secrets**
3. Add these secrets:

```
DATAFORSEO_LOGIN=your-email@dataforseo.com
DATAFORSEO_PASSWORD=your-dataforseo-password
GROQ_API_KEY=gsk_xxxxxxxxxxxxx
```

---

## Step 2: Deploy Backend Functions

### 2.1 Initialize Supabase CLI

```bash
# Login to Supabase
npx supabase login

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_ID
```

Your project ID is in the URL: `https://app.supabase.com/project/YOUR_PROJECT_ID`

### 2.2 Create Functions Directory

```bash
mkdir -p supabase/functions/geo-audit
mkdir -p supabase/functions/generate-content
```

### 2.3 Copy Function Files

Copy the files from `client-dashboard/backend/` to your `supabase/functions/` directory:

```bash
cp client-dashboard/backend/geo-audit/index.ts supabase/functions/geo-audit/
cp client-dashboard/backend/generate-content/index.ts supabase/functions/generate-content/
```

### 2.4 Deploy Functions

```bash
# Deploy geo-audit (main API)
npx supabase functions deploy geo-audit --no-verify-jwt

# Deploy generate-content (AI content)
npx supabase functions deploy generate-content --no-verify-jwt
```

### 2.5 Verify Deployment

Test the function:

```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/geo-audit \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_text": "Best dating apps in India 2025",
    "brand_name": "Juleo",
    "brand_tags": ["Juleo Club"],
    "competitors": ["Bumble", "Tinder"],
    "location_code": 2356,
    "models": ["groq_llama"]
  }'
```

---

## Step 3: Frontend Setup

### 3.1 Create React Project (if new)

```bash
npm create vite@latest my-dashboard -- --template react-ts
cd my-dashboard
npm install
```

### 3.2 Install Dependencies

```bash
npm install @supabase/supabase-js
npm install lucide-react
npm install tailwindcss postcss autoprefixer
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-tabs @radix-ui/react-checkbox
npm install @radix-ui/react-select @radix-ui/react-label
npm install class-variance-authority clsx tailwind-merge
```

### 3.3 Configure Tailwind

```bash
npx tailwindcss init -p
```

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
      },
    },
  },
  plugins: [],
}
```

### 3.4 Configure Supabase Client

Create `src/integrations/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "your-anon-key";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

### 3.5 Copy Frontend Files

```bash
cp client-dashboard/frontend/useClientDashboard.ts src/hooks/
cp client-dashboard/frontend/ClientDashboard.tsx src/pages/
cp client-dashboard/frontend/types.ts src/types/
```

### 3.6 Add Route

In your `App.tsx` or router config:

```tsx
import ClientDashboard from './pages/ClientDashboard';

// Add route
<Route path="/clients" element={<ClientDashboard />} />
```

### 3.7 Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173/clients`

---

## Step 4: Configure Clients

### Default Clients

The dashboard comes with 4 pre-configured pilot clients:

1. **Juleo Club** - Dating/Matrimony (India)
2. **Jagota** - Food/Beverage (Thailand)
3. **Post House Dental** - Healthcare (Surrey, UK)
4. **Shoptheyn** - E-commerce/Fashion (India)

### Adding New Clients

1. Click the client dropdown in the header
2. Select "Add New Client"
3. Fill in:
   - Client Name
   - Brand Name (for detection)
   - Industry (auto-fills competitors)
   - Target Region

### Location Codes

Common DataForSEO location codes:

| Region | Code |
|--------|------|
| India | 2356 |
| United States | 2840 |
| United Kingdom | 2826 |
| Thailand | 2764 |
| Singapore | 2702 |
| Australia | 2036 |
| Canada | 2124 |
| Germany | 2276 |

---

## Troubleshooting

### "Function not found" Error

1. Verify function is deployed: `npx supabase functions list`
2. Check function logs: `npx supabase functions logs geo-audit`
3. Ensure `--no-verify-jwt` flag was used

### "DataForSEO Error"

1. Verify credentials in Supabase secrets
2. Check DataForSEO account balance
3. Test API directly with curl

### "CORS Error"

The functions include CORS headers. If issues persist:
1. Check browser console for specific error
2. Verify Supabase URL in client config

### "No Results"

1. Check if prompt is too specific
2. Try broader search terms
3. Verify location code is correct

---

## Production Deployment

### Frontend (Netlify/Vercel)

```bash
npm run build
# Deploy dist/ folder
```

### Environment Variables

Set in your hosting platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Custom Domain

1. Add domain in Supabase dashboard
2. Update CORS in Edge Functions if needed

---

## Support

- Check `ARCHITECTURE.md` for technical details
- Review function logs for API errors
- Test individual components in isolation


---

## Understanding the Metrics

Quick reference for interpreting dashboard metrics.

### Share of Voice (SOV)

**What it measures:** Percentage of AI models that mention your brand.

**Formula:** `(Models with brand mention / Total models queried) × 100`

**Example:**
- Query 3 models: Google SERP, AI Overview, Groq Llama
- Brand appears in 2 of them
- SOV = 67%

**Benchmarks:**
| Score | Status | Action |
|-------|--------|--------|
| 70%+ | 🟢 Excellent | Maintain presence |
| 50-69% | 🟡 Good | Minor optimizations |
| 25-49% | 🟠 Moderate | Content strategy needed |
| <25% | 🔴 Low | Urgent intervention |

### Brand Rank

**What it measures:** Position in AI-generated numbered lists.

**Detection:** Parses patterns like "1. Brand", "2) Brand", "3] Brand"

**Scoring:**
- Rank #1: Best possible (100 points)
- Rank #2-3: Strong (80-90 points)
- Rank #4-5: Moderate (60-70 points)
- Rank #6+: Needs work (<60 points)
- No rank: Brand mentioned but not in list format

### Sentiment

**What it measures:** Tone of content around brand mentions.

**Analysis window:** 100 characters before and after each mention.

**Keywords tracked:**
- **Positive:** best, top, excellent, recommended, leading, trusted, popular, great, amazing, reliable, safe
- **Negative:** avoid, poor, worst, bad, unreliable, scam, fake, terrible, issues, problems

### Citations

**What it measures:** Sources that AI models reference when answering.

**Why it matters:** Getting cited by AI means your content is authoritative.

**Goal:** Appear in top citation sources for your industry queries.

### Cost Tracking

**Per-query costs:**
| Model | Cost |
|-------|------|
| Google SERP | $0.002 |
| Google AI Overview | $0.003 |
| Groq Llama | Free |

**Typical audit:** 10 prompts × 3 models = ~$0.05

---

## Next Steps

After setup, refer to:
- `ARCHITECTURE.md` - Deep dive into algorithms and data flow
- `README.md` - Feature overview and quick start
