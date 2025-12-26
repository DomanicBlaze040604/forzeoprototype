-- ============================================================================
-- ENTERPRISE SCALE INFRASTRUCTURE
-- Sustained load at 1M prompts/day, cost behavior, longitudinal trust
-- ============================================================================

-- ============================================================================
-- 1. HORIZONTAL SCALING: Queue Partitioning & Batch Processing
-- ============================================================================

-- Partitioned job queue for high throughput
-- Partition by scheduled_for date for efficient pruning
CREATE TABLE IF NOT EXISTS public.job_queue_partitioned (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  priority INTEGER DEFAULT 5,
  partition_key TEXT NOT NULL, -- YYYY-MM-DD or org_id for sharding
  batch_id UUID, -- For batch processing
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id, partition_key)
) PARTITION BY LIST (partition_key);

-- Create default partition
CREATE TABLE IF NOT EXISTS public.job_queue_default PARTITION OF public.job_queue_partitioned DEFAULT;

-- Batch processing table
CREATE TABLE IF NOT EXISTS public.job_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  
  -- Batch metadata
  batch_type TEXT NOT NULL CHECK (batch_type IN ('prompt_analysis', 'score_recalc', 'citation_verify', 'authority_update')),
  total_jobs INTEGER NOT NULL,
  completed_jobs INTEGER DEFAULT 0,
  failed_jobs INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_jobs > 0 THEN (completed_jobs::DECIMAL / total_jobs) * 100 ELSE 0 END
  ) STORED,
  
  -- Timing
  estimated_completion TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Cost tracking
  estimated_cost DECIMAL(10,4),
  actual_cost DECIMAL(10,4),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Worker registration for horizontal scaling
CREATE TABLE IF NOT EXISTS public.queue_workers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id TEXT NOT NULL UNIQUE,
  worker_type TEXT NOT NULL CHECK (worker_type IN ('analysis', 'scoring', 'citation', 'authority')),
  
  -- Status
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'processing', 'draining', 'offline')),
  current_job_id UUID,
  current_batch_id UUID,
  
  -- Capacity
  max_concurrent_jobs INTEGER DEFAULT 10,
  current_jobs INTEGER DEFAULT 0,
  jobs_processed_total BIGINT DEFAULT 0,
  jobs_failed_total BIGINT DEFAULT 0,
  
  -- Health
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_job_completed TIMESTAMP WITH TIME ZONE,
  avg_job_duration_ms INTEGER,
  
  -- Metadata
  region TEXT,
  version TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. COST MODELING: Enterprise Usage & Budget Controls
-- ============================================================================

-- Detailed cost breakdown per operation
CREATE TABLE IF NOT EXISTS public.cost_breakdown (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  
  -- What was charged
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'prompt_analysis', 'engine_query', 'citation_verify', 'score_calc',
    'ai_generation', 'serp_lookup', 'storage', 'bandwidth'
  )),
  operation_id UUID, -- Reference to the specific operation
  
  -- Cost components
  base_cost DECIMAL(10,6) NOT NULL,
  volume_discount DECIMAL(10,6) DEFAULT 0,
  surge_multiplier DECIMAL(5,2) DEFAULT 1.0,
  final_cost DECIMAL(10,6) NOT NULL,
  
  -- Context
  engine TEXT,
  prompt_count INTEGER DEFAULT 1,
  token_count INTEGER,
  
  -- Billing period
  billing_period TEXT NOT NULL, -- YYYY-MM
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Organization billing & budget
CREATE TABLE IF NOT EXISTS public.organization_billing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL UNIQUE,
  
  -- Plan
  plan_type TEXT DEFAULT 'starter' CHECK (plan_type IN ('starter', 'pro', 'enterprise', 'custom')),
  plan_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Limits
  monthly_prompt_limit INTEGER,
  monthly_cost_limit DECIMAL(10,2),
  daily_prompt_limit INTEGER,
  daily_cost_limit DECIMAL(10,2),
  
  -- Current usage
  current_month_prompts INTEGER DEFAULT 0,
  current_month_cost DECIMAL(10,4) DEFAULT 0,
  current_day_prompts INTEGER DEFAULT 0,
  current_day_cost DECIMAL(10,4) DEFAULT 0,
  
  -- Alerts
  alert_threshold_percent INTEGER DEFAULT 80,
  last_alert_sent TIMESTAMP WITH TIME ZONE,
  
  -- Billing contact
  billing_email TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cost forecasting
CREATE TABLE IF NOT EXISTS public.cost_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  
  -- Forecast period
  forecast_date DATE NOT NULL,
  forecast_type TEXT NOT NULL CHECK (forecast_type IN ('daily', 'weekly', 'monthly')),
  
  -- Predictions
  predicted_prompts INTEGER NOT NULL,
  predicted_cost DECIMAL(10,4) NOT NULL,
  confidence_interval_low DECIMAL(10,4),
  confidence_interval_high DECIMAL(10,4),
  
  -- Actuals (filled in after the fact)
  actual_prompts INTEGER,
  actual_cost DECIMAL(10,4),
  forecast_accuracy DECIMAL(5,2), -- Percentage accuracy
  
  -- Model info
  model_version TEXT,
  features_used JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id, forecast_date, forecast_type)
);

-- Usage patterns for forecasting
CREATE TABLE IF NOT EXISTS public.usage_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  
  -- Pattern identification
  pattern_date DATE NOT NULL,
  day_of_week INTEGER, -- 0-6
  hour_of_day INTEGER, -- 0-23
  
  -- Metrics
  prompt_count INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER,
  error_rate DECIMAL(5,4),
  cost DECIMAL(10,4),
  
  -- Engine breakdown
  engine_distribution JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id, pattern_date, hour_of_day)
);

-- ============================================================================
-- 3. LONGITUDINAL TRUST DATA: Historical Authority & Trend Analysis
-- ============================================================================

-- Daily authority snapshots (for trend analysis)
CREATE TABLE IF NOT EXISTS public.authority_daily_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  engine TEXT NOT NULL REFERENCES public.engine_authority(engine) ON DELETE CASCADE,
  
  -- Authority metrics
  reliability_score DECIMAL(5,2),
  citation_completeness DECIMAL(5,2),
  freshness_index DECIMAL(5,2),
  authority_weight DECIMAL(5,4),
  convergence_score DECIMAL(5,2),
  hallucination_rate DECIMAL(5,4),
  
  -- Volume metrics
  total_queries INTEGER,
  successful_queries INTEGER,
  failed_queries INTEGER,
  avg_response_time_ms INTEGER,
  
  -- Disagreement metrics
  disagreement_count INTEGER DEFAULT 0,
  disagreement_win_rate DECIMAL(5,2), -- How often this engine "won" disagreements
  
  -- Decay events
  decay_events INTEGER DEFAULT 0,
  recovery_events INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(snapshot_date, engine)
);

-- Trust trend analysis
CREATE TABLE IF NOT EXISTS public.trust_trends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engine TEXT NOT NULL REFERENCES public.engine_authority(engine) ON DELETE CASCADE,
  
  -- Trend period
  trend_start_date DATE NOT NULL,
  trend_end_date DATE NOT NULL,
  trend_type TEXT NOT NULL CHECK (trend_type IN ('7d', '30d', '90d', 'ytd')),
  
  -- Trend metrics
  authority_change DECIMAL(5,4), -- Delta over period
  authority_trend TEXT CHECK (authority_trend IN ('improving', 'stable', 'declining')),
  reliability_change DECIMAL(5,2),
  
  -- Volatility
  authority_volatility DECIMAL(5,4), -- Standard deviation
  max_authority DECIMAL(5,4),
  min_authority DECIMAL(5,4),
  
  -- Events
  outage_count INTEGER DEFAULT 0,
  total_outage_minutes INTEGER DEFAULT 0,
  decay_event_count INTEGER DEFAULT 0,
  
  -- Prediction
  predicted_authority_30d DECIMAL(5,4),
  prediction_confidence DECIMAL(5,2),
  
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(engine, trend_end_date, trend_type)
);

-- Cross-engine correlation (which engines move together?)
CREATE TABLE IF NOT EXISTS public.engine_correlations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  engine_a TEXT NOT NULL,
  engine_b TEXT NOT NULL,
  
  -- Correlation metrics
  correlation_period TEXT NOT NULL CHECK (correlation_period IN ('7d', '30d', '90d')),
  authority_correlation DECIMAL(5,4), -- -1 to 1
  reliability_correlation DECIMAL(5,4),
  disagreement_frequency DECIMAL(5,4), -- How often they disagree
  
  -- When they disagree, who wins?
  engine_a_win_rate DECIMAL(5,2),
  engine_b_win_rate DECIMAL(5,2),
  
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(engine_a, engine_b, correlation_period),
  CHECK(engine_a < engine_b) -- Ensure consistent ordering
);

-- ============================================================================
-- FUNCTIONS: Scale & Analytics
-- ============================================================================

-- Create daily partition for job queue
CREATE OR REPLACE FUNCTION public.create_job_partition(p_date DATE)
RETURNS void AS $$
DECLARE
  v_partition_name TEXT;
  v_partition_key TEXT;
BEGIN
  v_partition_key := to_char(p_date, 'YYYY-MM-DD');
  v_partition_name := 'job_queue_' || to_char(p_date, 'YYYYMMDD');
  
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.job_queue_partitioned FOR VALUES IN (%L)',
    v_partition_name,
    v_partition_key
  );
END;
$$ LANGUAGE plpgsql;

-- Batch job submission
CREATE OR REPLACE FUNCTION public.submit_batch_jobs(
  p_user_id UUID,
  p_organization_id UUID,
  p_batch_type TEXT,
  p_jobs JSONB -- Array of job payloads
)
RETURNS UUID AS $$
DECLARE
  v_batch_id UUID;
  v_job JSONB;
  v_job_count INTEGER;
  v_estimated_cost DECIMAL(10,4);
BEGIN
  v_job_count := jsonb_array_length(p_jobs);
  
  -- Estimate cost based on batch type
  v_estimated_cost := CASE p_batch_type
    WHEN 'prompt_analysis' THEN v_job_count * 0.005
    WHEN 'score_recalc' THEN v_job_count * 0.001
    WHEN 'citation_verify' THEN v_job_count * 0.002
    WHEN 'authority_update' THEN v_job_count * 0.0005
    ELSE v_job_count * 0.003
  END;
  
  -- Create batch
  INSERT INTO public.job_batches (user_id, organization_id, batch_type, total_jobs, estimated_cost)
  VALUES (p_user_id, p_organization_id, p_batch_type, v_job_count, v_estimated_cost)
  RETURNING id INTO v_batch_id;
  
  -- Create individual jobs
  FOR v_job IN SELECT * FROM jsonb_array_elements(p_jobs)
  LOOP
    INSERT INTO public.job_queue_partitioned (
      user_id, organization_id, job_type, payload, batch_id, partition_key
    ) VALUES (
      p_user_id, 
      p_organization_id, 
      p_batch_type, 
      v_job, 
      v_batch_id,
      to_char(now(), 'YYYY-MM-DD')
    );
  END LOOP;
  
  RETURN v_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check and enforce budget limits
CREATE OR REPLACE FUNCTION public.check_budget_limit(
  p_organization_id UUID,
  p_estimated_cost DECIMAL(10,4)
)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  current_usage DECIMAL(10,4),
  limit_amount DECIMAL(10,4),
  usage_percentage DECIMAL(5,2)
) AS $$
DECLARE
  v_billing RECORD;
BEGIN
  SELECT * INTO v_billing FROM public.organization_billing WHERE organization_id = p_organization_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT TRUE, 'No billing limits configured'::TEXT, 0::DECIMAL(10,4), NULL::DECIMAL(10,4), 0::DECIMAL(5,2);
    RETURN;
  END IF;
  
  -- Check daily limit
  IF v_billing.daily_cost_limit IS NOT NULL AND 
     (v_billing.current_day_cost + p_estimated_cost) > v_billing.daily_cost_limit THEN
    RETURN QUERY SELECT 
      FALSE, 
      format('Daily cost limit exceeded ($%s of $%s)', v_billing.current_day_cost, v_billing.daily_cost_limit),
      v_billing.current_day_cost,
      v_billing.daily_cost_limit,
      (v_billing.current_day_cost / v_billing.daily_cost_limit * 100)::DECIMAL(5,2);
    RETURN;
  END IF;
  
  -- Check monthly limit
  IF v_billing.monthly_cost_limit IS NOT NULL AND 
     (v_billing.current_month_cost + p_estimated_cost) > v_billing.monthly_cost_limit THEN
    RETURN QUERY SELECT 
      FALSE, 
      format('Monthly cost limit exceeded ($%s of $%s)', v_billing.current_month_cost, v_billing.monthly_cost_limit),
      v_billing.current_month_cost,
      v_billing.monthly_cost_limit,
      (v_billing.current_month_cost / v_billing.monthly_cost_limit * 100)::DECIMAL(5,2);
    RETURN;
  END IF;
  
  -- Allowed
  RETURN QUERY SELECT 
    TRUE, 
    'Within budget'::TEXT,
    v_billing.current_month_cost,
    v_billing.monthly_cost_limit,
    CASE WHEN v_billing.monthly_cost_limit > 0 
      THEN (v_billing.current_month_cost / v_billing.monthly_cost_limit * 100)::DECIMAL(5,2)
      ELSE 0::DECIMAL(5,2)
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record cost and update billing
CREATE OR REPLACE FUNCTION public.record_cost(
  p_user_id UUID,
  p_organization_id UUID,
  p_operation_type TEXT,
  p_base_cost DECIMAL(10,6),
  p_engine TEXT DEFAULT NULL,
  p_prompt_count INTEGER DEFAULT 1,
  p_operation_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_volume_discount DECIMAL(10,6) := 0;
  v_surge_multiplier DECIMAL(5,2) := 1.0;
  v_final_cost DECIMAL(10,6);
  v_billing RECORD;
BEGIN
  -- Get billing info for volume discount
  SELECT * INTO v_billing FROM public.organization_billing WHERE organization_id = p_organization_id;
  
  -- Calculate volume discount (10% after 100k prompts/month)
  IF v_billing IS NOT NULL AND v_billing.current_month_prompts > 100000 THEN
    v_volume_discount := p_base_cost * 0.10;
  END IF;
  
  -- TODO: Implement surge pricing during peak hours if needed
  
  v_final_cost := (p_base_cost - v_volume_discount) * v_surge_multiplier;
  
  -- Record cost breakdown
  INSERT INTO public.cost_breakdown (
    user_id, organization_id, operation_type, operation_id,
    base_cost, volume_discount, surge_multiplier, final_cost,
    engine, prompt_count, billing_period
  ) VALUES (
    p_user_id, p_organization_id, p_operation_type, p_operation_id,
    p_base_cost, v_volume_discount, v_surge_multiplier, v_final_cost,
    p_engine, p_prompt_count, to_char(now(), 'YYYY-MM')
  );
  
  -- Update billing totals
  IF p_organization_id IS NOT NULL THEN
    UPDATE public.organization_billing SET
      current_month_prompts = current_month_prompts + p_prompt_count,
      current_month_cost = current_month_cost + v_final_cost,
      current_day_prompts = current_day_prompts + p_prompt_count,
      current_day_cost = current_day_cost + v_final_cost,
      updated_at = now()
    WHERE organization_id = p_organization_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate daily authority snapshot
CREATE OR REPLACE FUNCTION public.generate_authority_snapshot(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER AS $$
DECLARE
  v_engine RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_engine IN SELECT * FROM public.engine_authority LOOP
    INSERT INTO public.authority_daily_snapshots (
      snapshot_date, engine,
      reliability_score, citation_completeness, freshness_index,
      authority_weight, convergence_score, hallucination_rate,
      total_queries, successful_queries, failed_queries, avg_response_time_ms
    ) VALUES (
      p_date, v_engine.engine,
      v_engine.reliability_score, v_engine.citation_completeness, v_engine.freshness_index,
      v_engine.authority_weight, v_engine.convergence_score, v_engine.hallucination_rate,
      v_engine.total_queries, v_engine.successful_queries, 
      v_engine.total_queries - v_engine.successful_queries, v_engine.avg_response_time_ms
    )
    ON CONFLICT (snapshot_date, engine) DO UPDATE SET
      reliability_score = EXCLUDED.reliability_score,
      citation_completeness = EXCLUDED.citation_completeness,
      freshness_index = EXCLUDED.freshness_index,
      authority_weight = EXCLUDED.authority_weight,
      convergence_score = EXCLUDED.convergence_score,
      hallucination_rate = EXCLUDED.hallucination_rate,
      total_queries = EXCLUDED.total_queries,
      successful_queries = EXCLUDED.successful_queries,
      failed_queries = EXCLUDED.failed_queries,
      avg_response_time_ms = EXCLUDED.avg_response_time_ms;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate trust trends
CREATE OR REPLACE FUNCTION public.calculate_trust_trends(
  p_engine TEXT,
  p_trend_type TEXT DEFAULT '30d'
)
RETURNS void AS $$
DECLARE
  v_days INTEGER;
  v_start_date DATE;
  v_end_date DATE := CURRENT_DATE;
  v_snapshots RECORD;
  v_authority_change DECIMAL(5,4);
  v_reliability_change DECIMAL(5,2);
  v_volatility DECIMAL(5,4);
  v_trend TEXT;
BEGIN
  v_days := CASE p_trend_type
    WHEN '7d' THEN 7
    WHEN '30d' THEN 30
    WHEN '90d' THEN 90
    WHEN 'ytd' THEN EXTRACT(DOY FROM CURRENT_DATE)::INTEGER
    ELSE 30
  END;
  
  v_start_date := v_end_date - v_days;
  
  -- Get aggregated metrics
  SELECT 
    MAX(authority_weight) - MIN(authority_weight) AS authority_range,
    STDDEV(authority_weight) AS authority_stddev,
    MAX(authority_weight) AS max_auth,
    MIN(authority_weight) AS min_auth,
    (SELECT authority_weight FROM public.authority_daily_snapshots 
     WHERE engine = p_engine AND snapshot_date = v_end_date) -
    (SELECT authority_weight FROM public.authority_daily_snapshots 
     WHERE engine = p_engine AND snapshot_date >= v_start_date ORDER BY snapshot_date LIMIT 1) AS auth_change,
    (SELECT reliability_score FROM public.authority_daily_snapshots 
     WHERE engine = p_engine AND snapshot_date = v_end_date) -
    (SELECT reliability_score FROM public.authority_daily_snapshots 
     WHERE engine = p_engine AND snapshot_date >= v_start_date ORDER BY snapshot_date LIMIT 1) AS rel_change
  INTO v_snapshots
  FROM public.authority_daily_snapshots
  WHERE engine = p_engine AND snapshot_date BETWEEN v_start_date AND v_end_date;
  
  v_authority_change := COALESCE(v_snapshots.auth_change, 0);
  v_reliability_change := COALESCE(v_snapshots.rel_change, 0);
  v_volatility := COALESCE(v_snapshots.authority_stddev, 0);
  
  v_trend := CASE
    WHEN v_authority_change > 0.02 THEN 'improving'
    WHEN v_authority_change < -0.02 THEN 'declining'
    ELSE 'stable'
  END;
  
  -- Count outages in period
  INSERT INTO public.trust_trends (
    engine, trend_start_date, trend_end_date, trend_type,
    authority_change, authority_trend, reliability_change,
    authority_volatility, max_authority, min_authority,
    outage_count, total_outage_minutes
  )
  SELECT 
    p_engine, v_start_date, v_end_date, p_trend_type,
    v_authority_change, v_trend, v_reliability_change,
    v_volatility, v_snapshots.max_auth, v_snapshots.min_auth,
    COUNT(*), COALESCE(SUM(duration_minutes), 0)
  FROM public.engine_outages
  WHERE engine = p_engine AND started_at BETWEEN v_start_date AND v_end_date
  ON CONFLICT (engine, trend_end_date, trend_type) DO UPDATE SET
    authority_change = EXCLUDED.authority_change,
    authority_trend = EXCLUDED.authority_trend,
    reliability_change = EXCLUDED.reliability_change,
    authority_volatility = EXCLUDED.authority_volatility,
    max_authority = EXCLUDED.max_authority,
    min_authority = EXCLUDED.min_authority,
    outage_count = EXCLUDED.outage_count,
    total_outage_minutes = EXCLUDED.total_outage_minutes,
    calculated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get throughput metrics
CREATE OR REPLACE FUNCTION public.get_throughput_metrics(
  p_organization_id UUID DEFAULT NULL,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  hour_bucket TIMESTAMP WITH TIME ZONE,
  jobs_submitted INTEGER,
  jobs_completed INTEGER,
  jobs_failed INTEGER,
  avg_duration_ms INTEGER,
  throughput_per_minute DECIMAL(10,2),
  estimated_cost DECIMAL(10,4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    date_trunc('hour', created_at) AS hour_bucket,
    COUNT(*)::INTEGER AS jobs_submitted,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER AS jobs_completed,
    COUNT(*) FILTER (WHERE status = 'failed' OR status = 'dead_letter')::INTEGER AS jobs_failed,
    AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::INTEGER AS avg_duration_ms,
    (COUNT(*)::DECIMAL / 60)::DECIMAL(10,2) AS throughput_per_minute,
    (COUNT(*) * 0.003)::DECIMAL(10,4) AS estimated_cost
  FROM public.job_queue_partitioned
  WHERE created_at > now() - (p_hours || ' hours')::INTERVAL
    AND (p_organization_id IS NULL OR organization_id = p_organization_id)
  GROUP BY date_trunc('hour', created_at)
  ORDER BY hour_bucket DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES FOR SCALE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_job_queue_part_status ON public.job_queue_partitioned(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_job_queue_part_batch ON public.job_queue_partitioned(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_queue_part_org ON public.job_queue_partitioned(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_batches_status ON public.job_batches(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_breakdown_org ON public.cost_breakdown(organization_id, billing_period);
CREATE INDEX IF NOT EXISTS idx_cost_breakdown_type ON public.cost_breakdown(operation_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_authority_snapshots_engine ON public.authority_daily_snapshots(engine, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_trust_trends_engine ON public.trust_trends(engine, trend_end_date DESC);
CREATE INDEX IF NOT EXISTS idx_usage_patterns_org ON public.usage_patterns(organization_id, pattern_date DESC);
CREATE INDEX IF NOT EXISTS idx_workers_status ON public.queue_workers(status, worker_type);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.job_queue_partitioned ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_breakdown ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_correlations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using DO block to handle existing policies)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own jobs' AND tablename = 'job_queue_partitioned') THEN
    CREATE POLICY "Users view own jobs" ON public.job_queue_partitioned FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own batches' AND tablename = 'job_batches') THEN
    CREATE POLICY "Users view own batches" ON public.job_batches FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own costs' AND tablename = 'cost_breakdown') THEN
    CREATE POLICY "Users view own costs" ON public.cost_breakdown FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role manages workers' AND tablename = 'queue_workers') THEN
    CREATE POLICY "Service role manages workers" ON public.queue_workers FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Org billing access' AND tablename = 'organization_billing') THEN
    CREATE POLICY "Org billing access" ON public.organization_billing FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view authority snapshots' AND tablename = 'authority_daily_snapshots') THEN
    CREATE POLICY "Anyone can view authority snapshots" ON public.authority_daily_snapshots FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view trust trends' AND tablename = 'trust_trends') THEN
    CREATE POLICY "Anyone can view trust trends" ON public.trust_trends FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view engine correlations' AND tablename = 'engine_correlations') THEN
    CREATE POLICY "Anyone can view engine correlations" ON public.engine_correlations FOR SELECT USING (true);
  END IF;
END $$;

-- ============================================================================
-- SCHEDULED JOBS (to be run via pg_cron or external scheduler)
-- ============================================================================

-- Daily: Reset daily counters
-- SELECT public.reset_daily_counters();

-- Daily: Generate authority snapshots
-- SELECT public.generate_authority_snapshot();

-- Daily: Calculate trust trends
-- SELECT public.calculate_trust_trends(engine, '7d') FROM public.engine_authority;
-- SELECT public.calculate_trust_trends(engine, '30d') FROM public.engine_authority;

-- Hourly: Create next day's partition
-- SELECT public.create_job_partition(CURRENT_DATE + 1);

-- Reset daily counters function
CREATE OR REPLACE FUNCTION public.reset_daily_counters()
RETURNS void AS $$
BEGIN
  UPDATE public.organization_billing SET
    current_day_prompts = 0,
    current_day_cost = 0,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
