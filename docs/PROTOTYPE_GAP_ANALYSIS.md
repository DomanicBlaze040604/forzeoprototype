# FORZEO Prototype vs Our Implementation - Gap Analysis

**Analysis Date:** December 27, 2025
**Reference:** https://ptron-forzeo-geo-analytics-906083889372.us-west1.run.app/

---

## Executive Summary

After analyzing all 8 screenshots from the reference prototype, I've identified **significant gaps** in our implementation. The prototype has several features we're **missing entirely**.

### Overall Assessment

| Category | Prototype Features | Our Features | Gap |
|----------|-------------------|--------------|-----|
| Navigation Items | 7 | 12 | We have MORE but DIFFERENT |
| Dashboard Metrics | 4 specific | 4 generic | DIFFERENT metrics |
| Content Generation | Full module | ❌ MISSING | **CRITICAL GAP** |
| Gap Analysis | Full module | ❌ MISSING | **CRITICAL GAP** |
| LLM Traffic | Full module | ❌ MISSING | **CRITICAL GAP** |
| Sources Page | Detailed | Partial | **NEEDS WORK** |
| Competitors Page | Detailed | Partial | **NEEDS WORK** |
| Prompts Page | Detailed | Similar | Minor gaps |

---

## Image-by-Image Analysis

### IMAGE 1: Dashboard
**Reference Prototype Dashboard:**

![Dashboard](reference)

**What They Have:**
1. **Header Bar:**
   - Brand selector: "Brand: Ptron"
   - Competitor selector: "vs. boAt, Noise"
   - Date range: "Last 30 Days"
   - Model filter: "All Models"

2. **Top Metrics (4 cards):**
   - SHARE OF VOICE (SOV): 6.1% (+0.2% vs last 30 days)
   - TOTAL MENTIONS: 58 (-12% out of 1089, 5.3%)
   - BRAND SENTIMENT: 65/100 Neutral (Below competitors)
   - AVG RANK IN LISTS: #6.2 Dropping (Lower half of lists)

3. **Visibility Trends (SOV) Chart:**
   - Multi-line chart showing Ptron vs boAt vs Noise
   - 30-day timeline (Day 1 to Day 29)
   - Shows "Ptron is closing the gap but trails boAt"

4. **Mentions by Category (Pie Chart):**
   - 80% visibility in Earbuds & Smartwatch
   - Categories: Wireless Earbuds, Smartwatch, Bluetooth Speakers, Accessories

5. **Top 5 Performing Prompts Table:**
   - Columns: PROMPT QUERY, DATE, MODEL, SOV IMPACT
   - "View All Prompts →" link

**What We Have:**
- ✅ Brand Visibility metric
- ✅ Total Mentions
- ✅ Sentiment indicator
- ✅ Competitor Gap
- ✅ Visibility Trend Chart
- ✅ Competitor Radar Chart
- ✅ Share of Voice Chart

**GAPS:**
| Feature | Prototype | Ours | Status |
|---------|-----------|------|--------|
| Brand selector in header | ✅ | ❌ | **MISSING** |
| Competitor selector in header | ✅ | ❌ | **MISSING** |
| Date range filter | ✅ | ❌ | **MISSING** |
| Model filter | ✅ | ❌ | **MISSING** |
| SOV % with trend | ✅ | Partial | **NEEDS WORK** |
| Mentions out of total | ✅ "58 out of 1089" | ❌ | **MISSING** |
| Sentiment score /100 | ✅ "65/100" | ❌ Text only | **NEEDS WORK** |
| Avg Rank in Lists | ✅ "#6.2" | ❌ | **MISSING** |
| Multi-brand trend line | ✅ 3 brands | ❌ Single | **NEEDS WORK** |
| Mentions by Category pie | ✅ | ❌ | **MISSING** |
| Top Performing Prompts | ✅ | ❌ | **MISSING** |

---

### IMAGE 2: Competitors Page
**Reference Prototype Competitors:**

**What They Have:**
1. **Competitive SOV & Rank Chart:**
   - Horizontal bar chart
   - Shows Total Mentions, Share of Voice %, Avg Rank
   - Tooltip: "Avg Rank (Inverse) - Noise: 2.1, Ptron: 6.2, boAt: 1.2"
   - Caption: "boAt dominates SOV, but Ptron leads in budget-specific value"

2. **Sentiment Breakdown Chart:**
   - Stacked bar chart (100% scale)
   - Shows Negative (red), Neutral (blue), Positive (green)
   - Per competitor: Ptron, boAt, Noise
   - Caption: "High 'Neutral' score reflects value-for-money positioning"

3. **Gap Analysis Table:**
   - Title: "Gap Analysis: Ptron vs Market Leader"
   - Button: "Focus Area: Citations & SOV"
   - Columns: METRIC, PTRON, BOAT (LEADER), NOISE, GAP TO LEADER
   - Rows:
     - Share of Voice: 6.1% vs 41.2% vs 28.5% = -35.1%
     - Avg List Rank: #6.2 vs #1.2 vs #2.1 = -5.0 Positions
     - Sentiment Score: 65 vs 78 vs 72 = -13 Points

**What We Have:**
- ✅ Competitor Radar Chart
- ✅ Competitor Benchmark UI
- ✅ Basic competitor tracking

**GAPS:**
| Feature | Prototype | Ours | Status |
|---------|-----------|------|--------|
| Competitive SOV bar chart | ✅ | ❌ | **MISSING** |
| Sentiment breakdown stacked | ✅ | ❌ | **MISSING** |
| Gap Analysis table | ✅ | ❌ | **MISSING** |
| Gap to Leader calculation | ✅ | ❌ | **MISSING** |
| Focus Area button | ✅ | ❌ | **MISSING** |

---

### IMAGE 3: Sources Page
**Reference Prototype Sources:**

**What They Have:**
1. **Filter Bar:**
   - All Topics dropdown
   - All Models dropdown
   - All Brands dropdown
   - Checkbox: "Exclude PTron"
   - Checkbox: "Group subdomains"
   - Export CSV button

2. **Summary Cards:**
   - Total Sources: 1089 (Unique webpages cited by AI chats)
   - Sources Mentioning PTron: 58 (Sources that mention PTron)

3. **Top Citing Domains Chart:**
   - Bar chart showing domain citation frequency
   - Title: "Top Citing Domains (Category Wide)"
   - Subtitle: "High authority sites driving competitor visibility"
   - Domains: timesofindia.indiatimes.com (~38), bajajfinserv.in (~12), rtings.com (~12), wikipedia.org (~12), cashkaro.com (~10)

**What We Have:**
- ✅ Sources page exists
- ✅ Citation tracking
- ✅ URL Citation Heatmap

**GAPS:**
| Feature | Prototype | Ours | Status |
|---------|-----------|------|--------|
| Multi-filter bar | ✅ | ❌ | **MISSING** |
| Total Sources count | ✅ | ❌ | **MISSING** |
| Sources mentioning brand | ✅ | ❌ | **MISSING** |
| Top Citing Domains bar chart | ✅ | ❌ | **MISSING** |
| Group subdomains option | ✅ | ❌ | **MISSING** |
| Export CSV button | ✅ | Partial | **NEEDS WORK** |

---

### IMAGE 4: Prompts Page
**Reference Prototype Prompts:**

**What They Have:**
1. **Summary Cards:**
   - Topics: 4 (Topics related to your brand)
   - Prompts: 65 (LLM prompts in all topics)
   - Responses: 66 (Responses from running prompts on LLMs)

2. **Search Bar:**
   - "Search prompts..."
   - Filter button: "Filter: Ptron Missing"

3. **Prompt Performance Log Table:**
   - Subtitle: "Detailed logs from Google AI, Perplexity, and Bing"
   - Columns: PROMPT/QUERY, TOPIC, MODEL, PTRON?, MENTIONED BRANDS, TIME
   - Example rows:
     - "earbuds with dual device pairing cheap" | Wireless Earbuds | Google AI Overview | ✅ | boAt, Amazfit, pTron | 2025-11-28
     - "spatial audio earbuds cheap" | Wireless Earbuds | GPT 5 | ❌ | Nothing Buds | 2025-11-28

**What We Have:**
- ✅ Prompts page
- ✅ Prompt list
- ✅ Brand mentioned indicator
- ✅ Model column

**GAPS:**
| Feature | Prototype | Ours | Status |
|---------|-----------|------|--------|
| Topics count card | ✅ | ❌ | **MISSING** |
| Prompts count card | ✅ | ❌ | **MISSING** |
| Responses count card | ✅ | ❌ | **MISSING** |
| Topic column | ✅ | ❌ | **MISSING** |
| Mentioned Brands tags | ✅ | Partial | **NEEDS WORK** |
| Filter: Brand Missing | ✅ | ❌ | **MISSING** |
| Timestamp column | ✅ | ❌ | **MISSING** |

---

### IMAGE 5: Gap Analysis Page
**Reference Prototype Gap Analysis:**

**⚠️ THIS IS A COMPLETELY MISSING FEATURE**

**What They Have:**
1. **Page Title:** "Content Gap Analysis"
2. **Subtitle:** "Your brand didn't appear in the response to the prompts below, for at least one LLM"

3. **Section:** "Prompts That Didn't Yield Your Brand"
4. **Filters:**
   - All LLMs dropdown
   - All Topics dropdown
   - "50 prompts" indicator

5. **Table Columns:**
   - PROMPT
   - EST. VOLUME (search volume!)
   - LLMS THAT DIDN'T MENTION BRAND
   - ACTION

6. **Example Rows:**
   - "portable speakers mini" | 3,49,810 | Google AI Overview | [Suggested Content]
   - "rank 20w v 30w charger" | 3,45,067 | GPT 5 | [Suggested Content]
   - "wireless earbuds under 1000" | 3,37,879 | GPT 5 | [Suggested Content]

7. **Action Button:** "Suggested Content" for each row

**What We Have:**
- ❌ **COMPLETELY MISSING**

**CRITICAL GAP:**
| Feature | Prototype | Ours | Status |
|---------|-----------|------|--------|
| Gap Analysis page | ✅ | ❌ | **CRITICAL** |
| Prompts without brand | ✅ | ❌ | **CRITICAL** |
| Search volume data | ✅ | ❌ | **CRITICAL** |
| LLMs that missed brand | ✅ | ❌ | **CRITICAL** |
| Suggested Content action | ✅ | ❌ | **CRITICAL** |
| Export All Suggestions | ✅ | ❌ | **CRITICAL** |

---

### IMAGE 6: Gap Analysis - Suggested Content Modal
**Reference Prototype Content Brief:**

**What They Have:**
1. **Modal Title:** "Suggested Content Brief"
2. **Subtitle:** "The following brief is for content that directly addresses the prompt, which is what models are looking for."

3. **Content Brief:**
   - TITLE: "Portable Power: The Best Bluetooth Speakers for Any Occasion"
   - CONTENT DESCRIPTION: "Write a 'Best of' listicle featuring portable speakers that deliver punchy sound. Specifically address 'portable speakers mini' by categorizing recommendations by use-case (party, travel, home). Include Ptron's speakers as the 'Best Budget Pick' or 'Value Champion' to ensure visibility in this category."

4. **Tip:** "Use the Source Analyzer to determine the optimal content structure and style for each LLM (length, tone, media format, etc.)"

5. **Action:** "Copy brief" button

**What We Have:**
- ❌ **COMPLETELY MISSING**

---

### IMAGE 7: LLM Traffic Page
**Reference Prototype LLM Traffic:**

**⚠️ THIS IS A COMPLETELY MISSING FEATURE**

**What They Have:**
1. **Page Title:** "Connect your Google Analytics Account"
2. **Description:** "To view the GEO Traffic Funnel and Attribution Models, please connect your existing analytics provider. We use this data to correlate AI visibility with actual site traffic."

3. **CTA Button:** "Connect Google Analytics →"

4. **Supported Integrations:**
   - Google Analytics 4
   - Adobe Analytics
   - Segment

**What We Have:**
- ❌ **COMPLETELY MISSING**

**CRITICAL GAP:**
| Feature | Prototype | Ours | Status |
|---------|-----------|------|--------|
| LLM Traffic page | ✅ | ❌ | **CRITICAL** |
| Google Analytics integration | ✅ | ❌ | **CRITICAL** |
| Adobe Analytics integration | ✅ | ❌ | **CRITICAL** |
| Segment integration | ✅ | ❌ | **CRITICAL** |
| GEO Traffic Funnel | ✅ | ❌ | **CRITICAL** |
| Attribution Models | ✅ | ❌ | **CRITICAL** |

---

### IMAGE 8: Content Generation Page
**Reference Prototype Content Gen:**

**⚠️ THIS IS A COMPLETELY MISSING FEATURE**

**What They Have:**
1. **Page Title:** "Generate Content"
2. **Subtitle:** "Create optimized content strategies based on your tracked topics."

3. **Tab Selection:**
   - Select Topic
   - Custom Topic

4. **Form Fields:**
   - Topic dropdown: "Choose a topic..." (from brand's tracked topics)
   - Content Type dropdown: "Blog Post" (Informative article with SEO optimization)
   - Model dropdown: "GPT-4.1"
   - Reference URLs (optional): Brand Voice dropdown + URL input + "Add URL" button

5. **Actions:**
   - "Generate Content" button (blue)
   - "Reset" button

6. **Content History Section:**
   - "Content History (1)"
   - "Show History" button

**What We Have:**
- ❌ **COMPLETELY MISSING**

**CRITICAL GAP:**
| Feature | Prototype | Ours | Status |
|---------|-----------|------|--------|
| Content Gen page | ✅ | ❌ | **CRITICAL** |
| Topic selection | ✅ | ❌ | **CRITICAL** |
| Content Type selection | ✅ | ❌ | **CRITICAL** |
| Model selection | ✅ | ❌ | **CRITICAL** |
| Reference URLs | ✅ | ❌ | **CRITICAL** |
| Brand Voice | ✅ | ❌ | **CRITICAL** |
| Generate Content | ✅ | ❌ | **CRITICAL** |
| Content History | ✅ | ❌ | **CRITICAL** |

---

## Navigation Comparison

### Prototype Navigation (7 items):
1. Dashboard
2. Competitors
3. Sources
4. Prompts
5. Gap Analysis ❌ **WE DON'T HAVE**
6. LLM Traffic ❌ **WE DON'T HAVE**
7. Content Gen ❌ **WE DON'T HAVE**

### Our Navigation (12 items):
1. Home (Dashboard)
2. War Room ✅ **EXTRA**
3. Search (Prompts)
4. Inbox (Alerts) ✅ **EXTRA**
5. Industry ✅ **EXTRA**
6. Topic ✅ **EXTRA**
7. Model ✅ **EXTRA**
8. Citation
9. Sources
10. Improve (Reports) ✅ **EXTRA**
11. Settings
12. Help & Support

### Navigation Gap Summary:
| We're Missing | We Have Extra |
|---------------|---------------|
| Gap Analysis | War Room |
| LLM Traffic | Inbox/Alerts |
| Content Gen | Industry |
| - | Topic |
| - | Model |
| - | Improve/Reports |

---

## Critical Missing Features Summary

### 🔴 CRITICAL (Must Have):

1. **Gap Analysis Module**
   - Page showing prompts where brand doesn't appear
   - Search volume data for each prompt
   - Which LLMs missed the brand
   - Suggested Content action button
   - Content brief generation

2. **LLM Traffic Module**
   - Google Analytics integration
   - Adobe Analytics integration
   - Segment integration
   - GEO Traffic Funnel visualization
   - Attribution Models

3. **Content Generation Module**
   - Topic-based content generation
   - Content type selection (Blog Post, etc.)
   - Model selection (GPT-4.1, etc.)
   - Reference URLs with Brand Voice
   - Content history

### 🟡 IMPORTANT (Should Have):

4. **Dashboard Enhancements**
   - Brand selector in header
   - Competitor selector in header
   - Date range filter
   - Model filter
   - Mentions by Category pie chart
   - Top Performing Prompts table
   - Multi-brand trend lines

5. **Competitors Page Enhancements**
   - Competitive SOV bar chart
   - Sentiment breakdown stacked chart
   - Gap Analysis table with Gap to Leader

6. **Sources Page Enhancements**
   - Multi-filter bar
   - Total Sources count
   - Top Citing Domains bar chart

7. **Prompts Page Enhancements**
   - Topics/Prompts/Responses count cards
   - Topic column
   - Mentioned Brands tags
   - Filter: Brand Missing

---

## Implementation Priority

### Phase 1: Critical Features (Immediate)
1. Gap Analysis page with content briefs
2. Content Generation module
3. LLM Traffic page (even if just placeholder for integrations)

### Phase 2: Dashboard & Filters
4. Global header filters (Brand, Competitor, Date, Model)
5. Mentions by Category pie chart
6. Top Performing Prompts table
7. Multi-brand trend lines

### Phase 3: Page Enhancements
8. Competitors page charts
9. Sources page enhancements
10. Prompts page enhancements

---

## Implementation Status (Updated Dec 27, 2025)

### ✅ COMPLETED - All Critical Features Now Functional:

1. **Gap Analysis Page** (`/gap-analysis`) - FULLY FUNCTIONAL
   - ✅ Fetches real prompts from database where brand wasn't mentioned
   - ✅ Shows estimated search volume for each prompt
   - ✅ Displays which LLMs missed the brand
   - ✅ "Suggested Content" button generates AI content briefs via Groq API
   - ✅ Content brief modal with title, description, keywords, format
   - ✅ Copy brief functionality
   - ✅ Filter by LLM and topic
   - ✅ Search functionality
   - ✅ Export capability

2. **Content Generation Page** (`/content-gen`) - FULLY FUNCTIONAL
   - ✅ Topic selection from preset list or custom input
   - ✅ Content type selection (Blog Post, Comparison, Listicle, Guide, Review)
   - ✅ Model selection (Groq/Llama 3.1, GPT-4, Claude 3.5)
   - ✅ Brand voice selection (Professional, Casual, Technical)
   - ✅ Reference URLs with validation
   - ✅ Real AI content generation via `ai-answer-generator` function
   - ✅ Content history stored in localStorage
   - ✅ Load from history, delete, clear all
   - ✅ Copy generated content
   - ✅ Editable output

3. **LLM Traffic Page** (`/llm-traffic`) - PLACEHOLDER READY
   - ✅ Google Analytics 4 integration UI
   - ✅ Adobe Analytics integration UI
   - ✅ Segment integration UI
   - ✅ Features preview (GEO Traffic Funnel, Attribution Models, ROI)
   - ⏳ Actual OAuth integration pending (requires GA4 API setup)

4. **Competitors Page** (`/competitors`) - FULLY FUNCTIONAL
   - ✅ Fetches real competitor data from database
   - ✅ Competitive SOV & Mentions horizontal bar chart (Recharts)
   - ✅ Sentiment Breakdown stacked bar chart
   - ✅ Gap Analysis table with Gap to Leader column
   - ✅ Summary metrics cards (Your SOV, Leader SOV, Gap, Competitors count)
   - ✅ Refresh functionality
   - ✅ Real-time data from `competitors` and `engine_results` tables

5. **Navigation Updated** - MATCHES PROTOTYPE
   - ✅ Dashboard → Competitors → Sources → Prompts → Gap Analysis → LLM Traffic → Content Gen
   - ✅ Extra features in "More" section: War Room, Alerts, Citations, Reports

### New Hooks Created:
- `useGapAnalysis.ts` - Fetches gap prompts, generates content briefs
- `useContentGeneration.ts` - Handles content generation, history management
- `useCompetitorAnalysis.ts` - Fetches competitor data, calculates gaps

### Navigation Comparison (After Update):

| Prototype | Our Implementation | Status |
|-----------|-------------------|--------|
| Dashboard | Dashboard (/) | ✅ |
| Competitors | Competitors (/competitors) | ✅ FUNCTIONAL |
| Sources | Sources (/sources) | ✅ |
| Prompts | Prompts (/search) | ✅ |
| Gap Analysis | Gap Analysis (/gap-analysis) | ✅ FUNCTIONAL |
| LLM Traffic | LLM Traffic (/llm-traffic) | ✅ UI READY |
| Content Gen | Content Gen (/content-gen) | ✅ FUNCTIONAL |

### Remaining Enhancements (Phase 2 - Nice to Have):

1. **Dashboard Enhancements**
   - [ ] Global header filters (Brand, Competitor, Date, Model)
   - [ ] Mentions by Category pie chart
   - [ ] Top Performing Prompts table
   - [ ] Multi-brand trend lines

2. **Sources Page Enhancements**
   - [ ] Multi-filter bar
   - [ ] Total Sources count card
   - [ ] Top Citing Domains bar chart

3. **Prompts Page Enhancements**
   - [ ] Topics/Prompts/Responses count cards
   - [ ] Topic column
   - [ ] Filter: Brand Missing

4. **LLM Traffic - Full Integration**
   - [ ] Google Analytics OAuth flow
   - [ ] Adobe Analytics integration
   - [ ] Segment integration
   - [ ] Real traffic correlation data

---

## Conclusion

**We now fully match the prototype's core navigation and critical features:**

| Feature | Prototype | Ours | Functional |
|---------|-----------|------|------------|
| Gap Analysis | ✅ | ✅ | ✅ Real data + AI briefs |
| Content Generation | ✅ | ✅ | ✅ Real AI generation |
| LLM Traffic | ✅ | ✅ | ⏳ UI ready, OAuth pending |
| Competitors | ✅ | ✅ | ✅ Real data + charts |
| Navigation | 7 items | 7 items | ✅ Exact match |

**Live at:** https://forzeo-ai-visibility.netlify.app

**Test the features:**
1. Go to Gap Analysis → Click "Suggested Content" on any prompt
2. Go to Content Gen → Select topic, type, generate content
3. Go to Competitors → View charts and gap analysis table
4. Go to LLM Traffic → See integration options
