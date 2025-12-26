-- ============================================================================
-- FEATURE 1: ENGINE AUTHORITY LAYER
-- Trust contract between FORZEO and each AI engine
-- ============================================================================

-- Engine authority metrics table
CREATE TABLE IF NOT EXISTS public.engine_authority (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engine TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  
  -- Core authority metrics
  reliability_score DECIMAL(5,2) DEFAULT 50.0 CHECK (reliability_score >= 0 AND reliability_score <= 100),
  citation_completeness DECIMAL(5,2) DEFAULT 50.0 CHECK (citation_completeness >= 0 AND citation_completeness <= 100),
  freshness_index DECIMAL(5,2) DEFAULT 50.0 CHECK (freshness_index >= 0 AND freshness_index <= 100),
  response_consistency DECIMAL(5,2) DEFAULT 50.0 CHECK (response_consistency >= 0 AND response_consistency <= 100),
  
  -- Calculated composite authority
  authority_weight DECIMAL(5,4) DEFAULT 1.0 CHECK (authority_weight >= 0 AND authority_weight <= 2),
  
  -- Tracking
  total_queries INTEGER DEFAULT 0,
  successful_queries INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  last_successful_query TIMESTAMP WITH TIME ZONE,
  last_failure TIMESTAMP WITH TIME ZONE,
  consecutive_failures INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'unavailable', 'maintenance')),
  status_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Engine health snapshots for degraded mode
CREATE TABLE IF NOT EXISTS public.engine_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engine TEXT NOT NULL REFERENCES public.engine_authority(engine) ON DELETE CASCADE,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('hourly', 'daily', 'weekly', 'manual')),
  
  -- Snapshot data
  reliability_score DECIMAL(5,2),
  citation_completeness DECIMAL(5,2),
  freshness_index DECIMAL(5,2),
  authority_weight DECIMAL(5,4),
  status TEXT,
  
  -- Aggregated metrics at snapshot time
  queries_in_period INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  avg_response_time_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Per-user engine result history with authority context
ALTER TABLE public.engine_results
ADD COLUMN IF NOT EXISTS engine_authority_at_query DECIMAL(5,4),
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS is_degraded_response BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS snapshot_id UUID REFERENCES public.engine_snapshots(id);

-- ============================================================================
-- FEATURE 2: ACTION-PRIORITIZED INSIGHTS
-- Severity & ROI scoring for executive decision-making
-- ============================================================================

-- Prioritized insights table
CREATE TABLE IF NOT EXISTS public.prioritized_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  
  -- Insight content
  insight_type TEXT NOT NULL CHECK (insight_type IN (
    'visibility_drop', 'visibility_gain', 'competitor_overtake', 
    'citation_opportunity', 'content_gap', 'sentiment_shift',
    'engine_specific', 'trending_topic', 'authority_change'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Priority scoring (the magic)
  severity_score INTEGER NOT NULL CHECK (severity_score >= 0 AND severity_score <= 100),
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  estimated_effort TEXT CHECK (estimated_effort IN ('low', 'medium', 'high')),
  estimated_upside INTEGER CHECK (estimated_upside >= 0 AND estimated_upside <= 100),
  
  -- Composite priority (auto-calculated)
  priority_rank INTEGER GENERATED ALWAYS AS (
    (severity_score * 0.35 + confidence_score * 0.25 + 
     CASE estimated_effort WHEN 'low' THEN 30 WHEN 'medium' THEN 20 ELSE 10 END * 0.2 +
     COALESCE(estimated_upside, 50) * 0.2)::INTEGER
  ) STORED,
  
  -- Action details
  recommended_action TEXT,
  action_category TEXT CHECK (action_category IN ('content_update', 'new_content', 'technical_fix', 'strategy_change', 'monitoring')),
  affected_prompts UUID[] DEFAULT '{}',
  affected_engines TEXT[] DEFAULT '{}',
  
  -- Context for "why this matters"
  impact_explanation TEXT,
  engine_authority_context JSONB DEFAULT '{}',
  
  -- Status tracking
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'in_progress', 'completed', 'dismissed')),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Validity
  valid_until TIMESTAMP WITH TIME ZONE,
  is_stale BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- FEATURE 3: DEGRADED MODE INTELLIGENCE
-- Grace under failure with transparent confidence downgrade
-- ============================================================================

-- Engine outage tracking
CREATE TABLE IF NOT EXISTS public.engine_outages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engine TEXT NOT NULL REFERENCES public.engine_authority(engine) ON DELETE CASCADE,
  
  -- Outage details
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE WHEN ended_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60 
    ELSE NULL END
  ) STORED,
  
  -- Impact
  affected_queries INTEGER DEFAULT 0,
  fallback_snapshot_id UUID REFERENCES public.engine_snapshots(id),
  
  -- Resolution
  resolution_type TEXT CHECK (resolution_type IN ('auto_recovered', 'manual_intervention', 'provider_fix', 'ongoing')),
  resolution_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Scores with confidence context
ALTER TABLE public.prompt_scores
ADD COLUMN IF NOT EXISTS is_estimated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS degraded_engines TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS confidence_downgrade_reason TEXT,
ADD COLUMN IF NOT EXISTS last_full_confidence_score INTEGER,
ADD COLUMN IF NOT EXISTS last_full_confidence_at TIMESTAMP WITH TIME ZONE;

-- User notifications for degraded mode
CREATE TABLE IF NOT EXISTS public.system_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = broadcast
  
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'engine_outage', 'engine_recovered', 'degraded_scores', 
    'reprocessing_complete', 'authority_change', 'system_maintenance'
  )),
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- Context
  related_engine TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  auto_dismiss_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- SEED DATA: Initial engine authority values
-- ============================================================================

INSERT INTO public.engine_authority (engine, display_name, reliability_score, citation_completeness, freshness_index, authority_weight) VALUES
  ('google_ai_mode', 'Google AI Mode', 85.0, 90.0, 95.0, 1.15),
  ('chatgpt', 'ChatGPT', 80.0, 75.0, 70.0, 1.0),
  ('perplexity', 'Perplexity', 88.0, 95.0, 90.0, 1.12),
  ('bing_copilot', 'Bing Copilot', 78.0, 85.0, 88.0, 1.05),
  ('gemini', 'Gemini', 82.0, 80.0, 85.0, 1.02),
  ('claude', 'Claude', 85.0, 70.0, 65.0, 0.95)
ON CONFLICT (engine) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  updated_at = now();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Calculate weighted AVS using engine authority
CREATE OR REPLACE FUNCTION public.calculate_weighted_avs(
  p_prompt_id UUID
)
RETURNS TABLE (
  weighted_avs DECIMAL(5,2),
  unweighted_avs DECIMAL(5,2),
  engine_breakdown JSONB,
  low_authority_impact TEXT
) AS $$
DECLARE
  v_results RECORD;
  v_total_weighted DECIMAL := 0;
  v_total_unweighted DECIMAL := 0;
  v_total_weight DECIMAL := 0;
  v_engine_count INTEGER := 0;
  v_breakdown JSONB := '[]'::JSONB;
  v_low_authority_engines TEXT[] := '{}';
BEGIN
  FOR v_results IN
    SELECT 
      er.engine,
      er.confidence_score,
      ea.authority_weight,
      ea.reliability_score,
      ea.display_name
    FROM public.engine_results er
    JOIN public.engine_authority ea ON er.engine = ea.engine
    WHERE er.prompt_id = p_prompt_id
  LOOP
    v_total_weighted := v_total_weighted + (COALESCE(v_results.confidence_score, 0) * v_results.authority_weight);
    v_total_unweighted := v_total_unweighted + COALESCE(v_results.confidence_score, 0);
    v_total_weight := v_total_weight + v_results.authority_weight;
    v_engine_count := v_engine_count + 1;
    
    v_breakdown := v_breakdown || jsonb_build_object(
      'engine', v_results.engine,
      'display_name', v_results.display_name,
      'raw_score', v_results.confidence_score,
      'authority_weight', v_results.authority_weight,
      'weighted_score', ROUND(v_results.confidence_score * v_results.authority_weight, 2)
    );
    
    IF v_results.authority_weight < 1.0 THEN
      v_low_authority_engines := array_append(v_low_authority_engines, v_results.display_name);
    END IF;
  END LOOP;
  
  IF v_engine_count = 0 THEN
    RETURN QUERY SELECT 0::DECIMAL(5,2), 0::DECIMAL(5,2), '[]'::JSONB, NULL::TEXT;
    RETURN;
  END IF;
  
  weighted_avs := ROUND(v_total_weighted / v_total_weight, 2);
  unweighted_avs := ROUND(v_total_unweighted / v_engine_count, 2);
  engine_breakdown := v_breakdown;
  
  IF array_length(v_low_authority_engines, 1) > 0 THEN
    low_authority_impact := 'Score affected by low-authority engines: ' || array_to_string(v_low_authority_engines, ', ');
  ELSE
    low_authority_impact := NULL;
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update engine authority based on query results
CREATE OR REPLACE FUNCTION public.update_engine_authority(
  p_engine TEXT,
  p_success BOOLEAN,
  p_response_time_ms INTEGER DEFAULT NULL,
  p_citation_count INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_current RECORD;
BEGIN
  SELECT * INTO v_current FROM public.engine_authority WHERE engine = p_engine;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  UPDATE public.engine_authority SET
    total_queries = total_queries + 1,
    successful_queries = CASE WHEN p_success THEN successful_queries + 1 ELSE successful_queries END,
    avg_response_time_ms = CASE 
      WHEN p_response_time_ms IS NOT NULL 
      THEN ((avg_response_time_ms * total_queries) + p_response_time_ms) / (total_queries + 1)
      ELSE avg_response_time_ms 
    END,
    last_successful_query = CASE WHEN p_success THEN now() ELSE last_successful_query END,
    last_failure = CASE WHEN NOT p_success THEN now() ELSE last_failure END,
    consecutive_failures = CASE WHEN p_success THEN 0 ELSE consecutive_failures + 1 END,
    reliability_score = CASE 
      WHEN total_queries > 10 
      THEN LEAST(100, GREATEST(0, (successful_queries::DECIMAL / total_queries) * 100))
      ELSE reliability_score 
    END,
    status = CASE 
      WHEN consecutive_failures >= 5 THEN 'unavailable'
      WHEN consecutive_failures >= 3 THEN 'degraded'
      ELSE 'healthy'
    END,
    authority_weight = CASE
      WHEN consecutive_failures >= 5 THEN 0.5
      WHEN consecutive_failures >= 3 THEN 0.75
      ELSE LEAST(1.5, 0.8 + (reliability_score / 100) * 0.4 + (citation_completeness / 100) * 0.2 + (freshness_index / 100) * 0.1)
    END,
    updated_at = now()
  WHERE engine = p_engine;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get top prioritized insights ("What to fix this week")
CREATE OR REPLACE FUNCTION public.get_weekly_priorities(
  p_user_id UUID,
  p_brand_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  insight_type TEXT,
  title TEXT,
  description TEXT,
  priority_rank INTEGER,
  severity_score INTEGER,
  confidence_score INTEGER,
  estimated_effort TEXT,
  estimated_upside INTEGER,
  recommended_action TEXT,
  impact_explanation TEXT,
  engine_authority_context JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pi.id,
    pi.insight_type,
    pi.title,
    pi.description,
    pi.priority_rank,
    pi.severity_score,
    pi.confidence_score,
    pi.estimated_effort,
    pi.estimated_upside,
    pi.recommended_action,
    pi.impact_explanation,
    pi.engine_authority_context
  FROM public.prioritized_insights pi
  WHERE pi.user_id = p_user_id
    AND (p_brand_id IS NULL OR pi.brand_id = p_brand_id)
    AND pi.status IN ('new', 'acknowledged')
    AND (pi.valid_until IS NULL OR pi.valid_until > now())
    AND pi.is_stale = FALSE
  ORDER BY pi.priority_rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get last known good snapshot for degraded mode
CREATE OR REPLACE FUNCTION public.get_fallback_snapshot(
  p_engine TEXT
)
RETURNS public.engine_snapshots AS $$
DECLARE
  v_snapshot public.engine_snapshots;
BEGIN
  SELECT * INTO v_snapshot
  FROM public.engine_snapshots
  WHERE engine = p_engine
    AND snapshot_type IN ('hourly', 'daily')
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_engine_authority_status ON public.engine_authority(status);
CREATE INDEX IF NOT EXISTS idx_engine_snapshots_engine ON public.engine_snapshots(engine, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prioritized_insights_user ON public.prioritized_insights(user_id, status, priority_rank DESC);
CREATE INDEX IF NOT EXISTS idx_prioritized_insights_brand ON public.prioritized_insights(brand_id, status);
CREATE INDEX IF NOT EXISTS idx_engine_outages_active ON public.engine_outages(engine) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_system_notifications_user ON public.system_notifications(user_id, is_active);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.engine_authority ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prioritized_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_outages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using DO block to handle existing policies)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view engine authority' AND tablename = 'engine_authority') THEN
    CREATE POLICY "Anyone can view engine authority" ON public.engine_authority FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view engine snapshots' AND tablename = 'engine_snapshots') THEN
    CREATE POLICY "Anyone can view engine snapshots" ON public.engine_snapshots FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own insights' AND tablename = 'prioritized_insights') THEN
    CREATE POLICY "Users view own insights" ON public.prioritized_insights FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage own insights' AND tablename = 'prioritized_insights') THEN
    CREATE POLICY "Users manage own insights" ON public.prioritized_insights FOR ALL USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view outages' AND tablename = 'engine_outages') THEN
    CREATE POLICY "Anyone can view outages" ON public.engine_outages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own notifications' AND tablename = 'system_notifications') THEN
    CREATE POLICY "Users view own notifications" ON public.system_notifications FOR SELECT 
      USING (user_id = auth.uid() OR user_id IS NULL);
  END IF;
END $$;
