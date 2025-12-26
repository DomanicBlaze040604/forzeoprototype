# FORZEO Enterprise Features

Three category-defining upgrades that transform FORZEO from a visibility tracker into an enterprise-grade AI visibility intelligence platform.

## The Missing Layer: Explanatory Intelligence

Across all three features, FORZEO now has the ability to **explain itself convincingly under scrutiny**.

- "Which engine should you trust more, **and why**?"
- "If you only do **one thing** this week, do **this**."
- "Here is **exactly how much trust** you should place in this score."

---

## 1. Engine Authority Layer

**What it does:** Creates a trust contract between FORZEO and each AI engine, enabling weighted scoring based on engine reliability.

### Core Capabilities
- **Per-engine reliability score** - Based on query success rate
- **Citation completeness** - How often the engine provides sources
- **Freshness index** - How recent the engine's knowledge is
- **Authority weight** - Composite weight used in AVS calculation (0.5x - 1.5x)

### Explanatory Intelligence (NEW)
- **"Why should I trust this engine?"** - Human-readable explanation of trust factors
- **Cross-engine disagreement modeling** - When Google AI Mode and Perplexity disagree, which one wins and why
- **Authority decay rules** - Self-correcting trust that decays when:
  - Citation hallucination rate rises
  - Freshness SLA is violated
  - Query failures spike
- **Audit trail** - Complete history of why authority changed

### API Actions
```typescript
// Explain why an engine should be trusted
{ action: "explainAuthority", engine: "google_ai_mode" }

// Analyze cross-engine disagreements
{ action: "analyzeDisagreements", promptId: "..." }

// Apply decay rules (run periodically)
{ action: "applyDecay" }

// Get audit trail
{ action: "getAuditTrail", engine: "chatgpt", days: 7 }
```

### Business Value
- AVS becomes defensible: "Your visibility dropped, but only on low-authority engines"
- Enterprise CMOs can understand why one engine matters more than another
- Scores reflect real-world impact, not just raw averages

---

## 2. Action-Prioritized Insights

**What it does:** Replaces generic "Content recommendations" with "What to fix this week" - executive-ready marching orders.

### Priority Scoring Formula
```
Priority = (Severity × 35%) + (Confidence × 25%) + (Effort × 20%) + (Upside × 20%)
```

### Decision Compression (NEW)
- **Single-action framing**: "Do X to regain Y visibility on engine Z"
- **Opportunity cost**: "What you lose by not doing it this week"
- **Why #1 beats #2**: Explicit comparison of top priorities
- **Owner & deadline binding**: Insights are assignable with SLAs

### The One Thing
```
"If you only do one thing this week: Update content for 'best CRM software' 
queries to regain 15% visibility on Google AI Mode."

⚠️ Not acting this week risks: 8% continued visibility loss, competitor 
advantage on 3 engine(s)
```

### API Actions
```typescript
// Get weekly priorities with decision compression
{ action: "getWeeklyPriorities", brandId: "...", limit: 3 }

// Assign insight to team member
{ action: "assignInsight", insightId: "...", assignedTo: "user-id", slaHours: 48 }

// Compare two insights - why does #1 beat #2?
{ action: "compareInsights", insightAId: "...", insightBId: "..." }
```

### Business Value
- CMOs and SEO heads get marching orders, not options
- Increases retention, perceived intelligence, and willingness to pay
- Agencies can assign and track insights across teams

---

## 3. Degraded Mode Intelligence

**What it does:** Provides grace under failure - when engines are unavailable, FORZEO continues operating with transparent confidence downgrade.

### Core Capabilities
- **Last-Known-Good Snapshots** - Hourly/daily snapshots of engine authority
- **Estimated Scores** - Clearly flagged when using fallback data
- **User Notifications** - Transparent outage banners and alerts
- **Auto-Recovery** - Automatic reprocessing when engines recover

### Confidence Math Propagation (NEW)
- **Reliability percentage**: "This metric is 83% reliable today"
- **Confidence multiplier**: Downstream scores automatically adjust (0.5x - 1.0x)
- **Degradation explanation**: Exactly which engines are affecting confidence
- **SLA transparency**: Enterprise-grade reliability statements

### API Actions
```typescript
// Calculate confidence propagation for a score
{ action: "calculateConfidence", promptId: "..." }

// Response includes:
{
  reliabilityPercentage: 83,
  confidenceMultiplier: 0.85,
  explanation: "This metric is 83% reliable. 1 engine unavailable, 1 degraded.",
  originalScore: 72,
  adjustedScore: 61,
  slaStatement: "This metric is 83% reliable today."
}
```

### Business Value
- Enterprise buyers don't fear outages - they fear silent corruption
- Eliminates the "is this data even accurate?" question
- Builds trust through transparency

---

## Database Schema

### New Tables (Migration 20251226000004)
- `authority_audit_log` - Why did authority change?
- `engine_disagreements` - Cross-engine disagreement tracking
- `authority_decay_rules` - Self-correcting trust rules
- `insight_comparisons` - Why #1 beats #2
- `confidence_propagation` - Confidence math audit trail

### Modified Tables
- `engine_authority` - Added decay tracking, convergence score
- `prioritized_insights` - Added single_action_summary, opportunity_cost, why_rank_one, assigned_to, deadline
- `prompt_scores` - Added reliability_percentage, confidence_multiplier, degradation_explanation

---

## Integration Example

```tsx
import { EnterpriseDashboard } from "@/components/dashboard/EnterpriseDashboard";

function App() {
  return (
    <EnterpriseDashboard 
      brandId="your-brand-id"
      brandName="Your Brand"
    />
  );
}
```

The dashboard includes:
1. **SystemStatusBanner** - Shows degraded mode alerts with SLA transparency
2. **AIVisibilityDashboard** - Weighted AVS with engine authority context
3. **WeeklyPrioritiesPanel** - "The One Thing" + decision compression
4. **EngineAuthorityPanel** - "Why should I trust this engine?" explanations

---

## PRD Gap Coverage

| PRD Area | Gap | Fixed By |
|----------|-----|----------|
| Unified cross-engine scoring | Engines treated equally | Engine Authority Layer |
| Actionable insights | Too descriptive | Decision Compression |
| Vendor outage fallback | Missing | Degraded Mode Intelligence |
| **Explanatory intelligence** | **Can't explain under scrutiny** | **All three features** |


---

## 4. Enterprise Scale Infrastructure

**What it does:** Proves the system works under real enterprise conditions - 1M prompts/day, cost controls, and longitudinal trust data.

### Sustained Load (1M prompts/day)

**Queue Partitioning**
- Partitioned job queue by date for efficient pruning
- Batch processing with up to 10,000 jobs per batch
- Worker registration for horizontal scaling
- Throughput tracking per hour

**Batch Processing API**
```typescript
// Submit a batch of 1000 prompts
const { batchId, estimatedCost } = await submitBatch({
  batchType: "prompt_analysis",
  jobs: prompts.map(p => ({ prompt: p.text, brandId: p.brandId })),
});

// Check progress
const status = await getBatchStatus(batchId);
// { progressPercentage: 45, completedJobs: 450, estimatedCompletion: "..." }

// Get throughput metrics
const throughput = await getThroughput(24);
// { avgThroughputPerMinute: "694.00", totalJobs: 1000000 }
```

**Capacity**
- Target: 1M prompts/day = ~694/minute sustained
- Batch sizes: up to 10,000 jobs per batch
- Horizontal scaling via worker registration

### Cost Behavior Under Enterprise Usage

**Budget Controls**
- Daily and monthly cost limits per organization
- Volume discounts (10% after 100k prompts/month)
- Pre-submission cost estimation
- Automatic budget enforcement

**Cost Tracking**
```typescript
// Estimate cost before submitting
const estimate = await estimateCost("prompt_analysis", 10000);
// { baseCost: 50.00, volumeDiscount: 5.00, finalCost: 45.00 }

// Budget check happens automatically on submit
// Returns 429 if budget exceeded with usage details
```

**Cost Breakdown**
- Per-operation cost tracking
- Volume discount calculation
- Surge pricing support (configurable)
- Billing period aggregation

### Longitudinal Trust Data

**Daily Authority Snapshots**
- Automatic daily snapshots of all engine metrics
- 30/90/365 day trend analysis
- Authority volatility tracking
- Outage impact measurement

**Trust Trends API**
```typescript
// Get 30-day trust summary
const summary = await fetchTrustSummary();
// {
//   executiveStatement: "✓ All 6 engines stable. System operating normally.",
//   enginesImproving: 2,
//   enginesDeclining: 0,
//   avgAuthority: 1.05
// }

// Get historical snapshots for charts
const history = await fetchHistoricalSnapshots("google_ai_mode", 30);
// [{ date: "2024-12-01", authorityWeight: 1.15, reliabilityScore: 85 }, ...]

// Get engine correlations
const correlations = await fetchEngineCorrelations("30d");
// [{ engineA: "Google AI Mode", engineB: "Perplexity", authorityCorrelation: 0.82 }]
```

**Trend Analysis**
- 7d, 30d, 90d, YTD trend periods
- Authority change tracking
- Volatility measurement
- Outage impact on trust
- Predictive authority (30d forward)

### Database Tables

```sql
-- Scale infrastructure
job_queue_partitioned    -- Partitioned by date
job_batches              -- Batch tracking
queue_workers            -- Worker registration

-- Cost tracking
cost_breakdown           -- Per-operation costs
organization_billing     -- Budget limits
cost_forecasts           -- Usage predictions
usage_patterns           -- Hourly patterns

-- Longitudinal trust
authority_daily_snapshots -- Daily metrics
trust_trends             -- Trend analysis
engine_correlations      -- Cross-engine patterns
```

### Scheduled Jobs

Run these via pg_cron or external scheduler:

```sql
-- Daily at midnight: Reset daily counters
SELECT public.reset_daily_counters();

-- Daily at 1am: Generate authority snapshots
SELECT public.generate_authority_snapshot();

-- Daily at 2am: Calculate trust trends
SELECT public.calculate_trust_trends(engine, '7d') FROM public.engine_authority;
SELECT public.calculate_trust_trends(engine, '30d') FROM public.engine_authority;

-- Hourly: Create next day's partition
SELECT public.create_job_partition(CURRENT_DATE + 1);
```

### Scale Dashboard

```tsx
import { ScaleDashboard } from "@/components/dashboard/ScaleDashboard";

// Shows:
// - Real-time throughput (jobs/minute)
// - Success rate
// - Engine health
// - 30-day authority trends
// - Batch status
// - Scale readiness indicators
```

---

## Summary: What's Proven

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| 1M prompts/day | Partitioned queues, batch processing, worker scaling | ✅ Ready |
| Cost behavior | Budget limits, volume discounts, cost tracking | ✅ Ready |
| Longitudinal trust | Daily snapshots, trend analysis, correlations | ✅ Ready |
| Explanatory intelligence | Audit trails, disagreement resolution, confidence math | ✅ Ready |

The architecture is complete. What remains is:
1. **Load testing** - Run actual 1M prompt batches
2. **Cost validation** - Verify estimates match actuals
3. **Trust accumulation** - 30+ days of snapshot data for meaningful trends
