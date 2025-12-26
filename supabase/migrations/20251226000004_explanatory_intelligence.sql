-- ============================================================================
-- EXPLANATORY INTELLIGENCE LAYER
-- The ability for FORZEO to explain itself convincingly under scrutiny
-- ============================================================================

-- ============================================================================
-- 1. ENGINE AUTHORITY: Cross-Engine Disagreement & Decay
-- ============================================================================

-- Authority change audit log (enterprises demand explanation)
CREATE TABLE IF NOT EXISTS public.authority_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  engine TEXT NOT NULL REFERENCES public.engine_authority(engine) ON DELETE CASCADE,
  
  -- What changed
  change_type TEXT NOT NULL CHECK (change_type IN (
    'reliability_change', 'citation_decay', 'freshness_violation', 
    'convergence_boost', 'divergence_penalty', 'hallucination_detected',
    'sla_violation', 'manual_override', 'auto_recovery'
  )),
  
  -- Before/after
  previous_authority_weight DECIMAL(5,4),
  new_authority_weight DECIMAL(5,4),
  previous_reliability DECIMAL(5,2),
  new_reliability DECIMAL(5,2),
  
  -- The explanation (human-readable)
  explanation TEXT NOT NULL,
  
  -- Supporting evidence
  evidence JSONB DEFAULT '{}',
  -- e.g., { "disagreement_with": ["perplexity", "gemini"], "convergence_rate": 0.3 }
  
  -- Who/what triggered this
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('system', 'decay_job', 'query_result', 'admin', 'sla_monitor')),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Engine disagreement tracking
CREATE TABLE IF NOT EXISTS public.engine_disagreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  
  -- The disagreement
  engine_a TEXT NOT NULL,
  engine_b TEXT NOT NULL,
  disagreement_type TEXT NOT NULL CHECK (disagreement_type IN (
    'brand_mention', 'sentiment', 'ranking', 'citation_source', 'factual_claim'
  )),
  
  -- What each engine said
  engine_a_value JSONB NOT NULL,
  engine_b_value JSONB NOT NULL,
  
  -- Resolution
  winner TEXT, -- Which engine was "right" (if determinable)
  resolution_method TEXT CHECK (resolution_method IN (
    'majority_vote', 'authority_weighted', 'ground_truth', 'unresolved', 'manual'
  )),
  resolution_explanation TEXT,
  
  -- Impact on authority
  authority_impact_a DECIMAL(5,4) DEFAULT 0,
  authority_impact_b DECIMAL(5,4) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Authority decay rules (self-correcting)
CREATE TABLE IF NOT EXISTS public.authority_decay_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  rule_name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  
  -- Trigger conditions
  trigger_metric TEXT NOT NULL CHECK (trigger_metric IN (
    'hallucination_rate', 'freshness_age_days', 'failure_rate', 
    'disagreement_rate', 'citation_accuracy', 'response_time_p95'
  )),
  trigger_threshold DECIMAL(10,4) NOT NULL,
  trigger_operator TEXT NOT NULL CHECK (trigger_operator IN ('>', '<', '>=', '<=', '=')),
  
  -- Decay action
  decay_amount DECIMAL(5,4) NOT NULL, -- How much to reduce authority
  decay_type TEXT NOT NULL CHECK (decay_type IN ('absolute', 'percentage')),
  min_authority DECIMAL(5,4) DEFAULT 0.3, -- Floor
  
  -- Recovery
  recovery_threshold DECIMAL(10,4), -- When to start recovering
  recovery_rate DECIMAL(5,4) DEFAULT 0.01, -- Per check
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default decay rules
INSERT INTO public.authority_decay_rules (rule_name, description, trigger_metric, trigger_threshold, trigger_operator, decay_amount, decay_type) VALUES
  ('high_hallucination', 'Decay when hallucination rate exceeds 15%', 'hallucination_rate', 0.15, '>', 0.05, 'absolute'),
  ('stale_knowledge', 'Decay when freshness exceeds 30 days', 'freshness_age_days', 30, '>', 0.02, 'percentage'),
  ('unreliable', 'Decay when failure rate exceeds 20%', 'failure_rate', 0.20, '>', 0.08, 'absolute'),
  ('high_disagreement', 'Decay when disagreement rate exceeds 40%', 'disagreement_rate', 0.40, '>', 0.03, 'absolute'),
  ('slow_response', 'Decay when P95 response time exceeds 10s', 'response_time_p95', 10000, '>', 0.01, 'absolute')
ON CONFLICT (rule_name) DO NOTHING;

-- Add decay tracking to engine_authority
ALTER TABLE public.engine_authority
ADD COLUMN IF NOT EXISTS hallucination_rate DECIMAL(5,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_decay_check TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS decay_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS convergence_score DECIMAL(5,2) DEFAULT 50,
ADD COLUMN IF NOT EXISTS last_convergence_check TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- 2. PRIORITIZED INSIGHTS: Decision Compression & Ownership
-- ============================================================================

-- Add decision compression fields to insights
ALTER TABLE public.prioritized_insights
ADD COLUMN IF NOT EXISTS single_action_summary TEXT, -- "Do X to regain Y on Z"
ADD COLUMN IF NOT EXISTS opportunity_cost TEXT, -- What you lose by not doing it
ADD COLUMN IF NOT EXISTS why_rank_one TEXT, -- Why this beats the others
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_hours INTEGER,
ADD COLUMN IF NOT EXISTS overdue BOOLEAN DEFAULT FALSE;

-- Function to update overdue status (called by trigger or scheduled job)
CREATE OR REPLACE FUNCTION public.update_insight_overdue_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.overdue := NEW.deadline IS NOT NULL 
    AND NEW.deadline < CURRENT_TIMESTAMP 
    AND NEW.status NOT IN ('completed', 'dismissed');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update overdue on insert/update
DROP TRIGGER IF EXISTS trg_update_insight_overdue ON public.prioritized_insights;
CREATE TRIGGER trg_update_insight_overdue
  BEFORE INSERT OR UPDATE ON public.prioritized_insights
  FOR EACH ROW
  EXECUTE FUNCTION public.update_insight_overdue_status();

-- Insight comparison table (why #1 beats #2)
CREATE TABLE IF NOT EXISTS public.insight_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  
  -- The comparison
  insight_a_id UUID NOT NULL REFERENCES public.prioritized_insights(id) ON DELETE CASCADE,
  insight_b_id UUID NOT NULL REFERENCES public.prioritized_insights(id) ON DELETE CASCADE,
  
  -- Why A beats B
  comparison_explanation TEXT NOT NULL,
  
  -- Factors
  severity_delta INTEGER, -- A.severity - B.severity
  confidence_delta INTEGER,
  effort_advantage TEXT, -- 'a_easier', 'b_easier', 'equal'
  upside_delta INTEGER,
  
  -- The decisive factor
  decisive_factor TEXT NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. DEGRADED MODE: Confidence Math Propagation
-- ============================================================================

-- Confidence propagation tracking
CREATE TABLE IF NOT EXISTS public.confidence_propagation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- What score was affected
  score_type TEXT NOT NULL CHECK (score_type IN ('avs', 'citation', 'authority', 'sov', 'insight')),
  entity_id UUID NOT NULL, -- prompt_id, insight_id, etc.
  
  -- Original vs adjusted
  original_value DECIMAL(10,4) NOT NULL,
  adjusted_value DECIMAL(10,4) NOT NULL,
  confidence_multiplier DECIMAL(5,4) NOT NULL, -- 0.0 to 1.0
  
  -- Why
  degradation_sources JSONB NOT NULL, -- [{ "engine": "chatgpt", "reason": "unavailable", "impact": 0.15 }]
  explanation TEXT NOT NULL,
  
  -- SLA transparency
  reliability_percentage DECIMAL(5,2) NOT NULL, -- "This metric is 83% reliable today"
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add SLA fields to prompt_scores
ALTER TABLE public.prompt_scores
ADD COLUMN IF NOT EXISTS reliability_percentage DECIMAL(5,2) DEFAULT 100,
ADD COLUMN IF NOT EXISTS confidence_multiplier DECIMAL(5,4) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS degradation_explanation TEXT,
ADD COLUMN IF NOT EXISTS engines_contributing INTEGER,
ADD COLUMN IF NOT EXISTS engines_expected INTEGER;

-- ============================================================================
-- FUNCTIONS: Explanatory Intelligence
-- ============================================================================

-- Calculate cross-engine convergence/divergence
CREATE OR REPLACE FUNCTION public.calculate_engine_convergence(
  p_prompt_id UUID
)
RETURNS TABLE (
  convergence_score DECIMAL(5,2),
  disagreement_count INTEGER,
  explanation TEXT,
  engine_agreements JSONB
) AS $$
DECLARE
  v_results RECORD;
  v_brand_mentions JSONB := '{}';
  v_sentiments JSONB := '{}';
  v_total_engines INTEGER := 0;
  v_agreement_count INTEGER := 0;
  v_disagreements INTEGER := 0;
BEGIN
  -- Collect all engine results for this prompt
  FOR v_results IN
    SELECT engine, brand_mentioned, sentiment, confidence_score
    FROM public.engine_results
    WHERE prompt_id = p_prompt_id
  LOOP
    v_total_engines := v_total_engines + 1;
    v_brand_mentions := v_brand_mentions || jsonb_build_object(v_results.engine, v_results.brand_mentioned);
    v_sentiments := v_sentiments || jsonb_build_object(v_results.engine, v_results.sentiment);
  END LOOP;
  
  IF v_total_engines < 2 THEN
    RETURN QUERY SELECT 100.0::DECIMAL(5,2), 0, 'Insufficient engines for comparison'::TEXT, '{}'::JSONB;
    RETURN;
  END IF;
  
  -- Count agreements on brand mention
  SELECT COUNT(DISTINCT value) INTO v_disagreements FROM jsonb_each(v_brand_mentions);
  IF v_disagreements = 1 THEN
    v_agreement_count := v_agreement_count + 1;
  END IF;
  
  -- Count agreements on sentiment
  SELECT COUNT(DISTINCT value) INTO v_disagreements FROM jsonb_each(v_sentiments);
  IF v_disagreements = 1 THEN
    v_agreement_count := v_agreement_count + 1;
  END IF;
  
  -- Calculate convergence (0-100)
  convergence_score := (v_agreement_count::DECIMAL / 2) * 100;
  disagreement_count := 2 - v_agreement_count;
  
  IF convergence_score >= 80 THEN
    explanation := 'High convergence: Engines largely agree on brand presence and sentiment';
  ELSIF convergence_score >= 50 THEN
    explanation := 'Moderate convergence: Some disagreement between engines';
  ELSE
    explanation := 'Low convergence: Significant disagreement - scores should be interpreted with caution';
  END IF;
  
  engine_agreements := jsonb_build_object(
    'brand_mention_agreement', (SELECT COUNT(DISTINCT value) = 1 FROM jsonb_each(v_brand_mentions)),
    'sentiment_agreement', (SELECT COUNT(DISTINCT value) = 1 FROM jsonb_each(v_sentiments)),
    'engines_compared', v_total_engines
  );
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply authority decay rules
CREATE OR REPLACE FUNCTION public.apply_authority_decay()
RETURNS TABLE (
  engine TEXT,
  rule_applied TEXT,
  previous_weight DECIMAL(5,4),
  new_weight DECIMAL(5,4),
  explanation TEXT
) AS $$
DECLARE
  v_engine RECORD;
  v_rule RECORD;
  v_metric_value DECIMAL(10,4);
  v_should_decay BOOLEAN;
  v_decay_amount DECIMAL(5,4);
  v_new_weight DECIMAL(5,4);
  v_explanation TEXT;
BEGIN
  FOR v_engine IN SELECT * FROM public.engine_authority LOOP
    FOR v_rule IN SELECT * FROM public.authority_decay_rules WHERE is_active = TRUE LOOP
      -- Get current metric value
      CASE v_rule.trigger_metric
        WHEN 'hallucination_rate' THEN v_metric_value := v_engine.hallucination_rate;
        WHEN 'failure_rate' THEN v_metric_value := 1 - (v_engine.successful_queries::DECIMAL / GREATEST(v_engine.total_queries, 1));
        WHEN 'freshness_age_days' THEN v_metric_value := EXTRACT(EPOCH FROM (now() - COALESCE(v_engine.last_successful_query, now() - interval '365 days'))) / 86400;
        WHEN 'response_time_p95' THEN v_metric_value := v_engine.avg_response_time_ms * 1.5; -- Approximate P95
        ELSE v_metric_value := 0;
      END CASE;
      
      -- Check if decay should apply
      v_should_decay := CASE v_rule.trigger_operator
        WHEN '>' THEN v_metric_value > v_rule.trigger_threshold
        WHEN '<' THEN v_metric_value < v_rule.trigger_threshold
        WHEN '>=' THEN v_metric_value >= v_rule.trigger_threshold
        WHEN '<=' THEN v_metric_value <= v_rule.trigger_threshold
        WHEN '=' THEN v_metric_value = v_rule.trigger_threshold
        ELSE FALSE
      END;
      
      IF v_should_decay THEN
        -- Calculate decay
        v_decay_amount := CASE v_rule.decay_type
          WHEN 'absolute' THEN v_rule.decay_amount
          WHEN 'percentage' THEN v_engine.authority_weight * v_rule.decay_amount
          ELSE 0
        END;
        
        v_new_weight := GREATEST(v_rule.min_authority, v_engine.authority_weight - v_decay_amount);
        
        IF v_new_weight < v_engine.authority_weight THEN
          v_explanation := format(
            '%s triggered: %s is %s (threshold: %s %s). Authority reduced from %s to %s.',
            v_rule.rule_name,
            v_rule.trigger_metric,
            ROUND(v_metric_value::NUMERIC, 4),
            v_rule.trigger_operator,
            v_rule.trigger_threshold,
            ROUND(v_engine.authority_weight::NUMERIC, 4),
            ROUND(v_new_weight::NUMERIC, 4)
          );
          
          -- Update engine authority
          UPDATE public.engine_authority SET
            authority_weight = v_new_weight,
            decay_streak = decay_streak + 1,
            last_decay_check = now(),
            updated_at = now()
          WHERE engine_authority.engine = v_engine.engine;
          
          -- Log the change
          INSERT INTO public.authority_audit_log (
            engine, change_type, previous_authority_weight, new_authority_weight,
            explanation, evidence, triggered_by
          ) VALUES (
            v_engine.engine,
            CASE v_rule.trigger_metric
              WHEN 'hallucination_rate' THEN 'hallucination_detected'
              WHEN 'freshness_age_days' THEN 'freshness_violation'
              WHEN 'failure_rate' THEN 'reliability_change'
              ELSE 'sla_violation'
            END,
            v_engine.authority_weight,
            v_new_weight,
            v_explanation,
            jsonb_build_object('rule', v_rule.rule_name, 'metric_value', v_metric_value, 'threshold', v_rule.trigger_threshold),
            'decay_job'
          );
          
          engine := v_engine.engine;
          rule_applied := v_rule.rule_name;
          previous_weight := v_engine.authority_weight;
          new_weight := v_new_weight;
          explanation := v_explanation;
          RETURN NEXT;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generate single-action summary for insight
CREATE OR REPLACE FUNCTION public.generate_insight_summary(
  p_insight_id UUID
)
RETURNS TABLE (
  single_action TEXT,
  opportunity_cost TEXT,
  why_rank_one TEXT
) AS $$
DECLARE
  v_insight RECORD;
  v_higher_ranked RECORD;
BEGIN
  SELECT * INTO v_insight FROM public.prioritized_insights WHERE id = p_insight_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Generate single action summary: "Do X to regain Y visibility on Z"
  single_action := CASE v_insight.insight_type
    WHEN 'visibility_drop' THEN format(
      'Update content for "%s" queries to regain %s%% visibility',
      COALESCE((v_insight.engine_authority_context->>'primary_topic')::TEXT, 'affected'),
      v_insight.estimated_upside
    )
    WHEN 'competitor_overtake' THEN format(
      'Create comprehensive content to reclaim position from competitor (potential +%s%% visibility)',
      v_insight.estimated_upside
    )
    WHEN 'citation_opportunity' THEN format(
      'Publish authoritative content to capture %s%% citation opportunity',
      v_insight.estimated_upside
    )
    WHEN 'content_gap' THEN format(
      'Fill content gap to gain %s%% visibility on underserved queries',
      v_insight.estimated_upside
    )
    ELSE format('Take action to improve visibility by %s%%', v_insight.estimated_upside)
  END;
  
  -- Generate opportunity cost
  opportunity_cost := format(
    'Not acting this week risks: %s%% continued visibility loss, competitor advantage on %s engine(s)',
    LEAST(v_insight.severity_score * 0.3, 25)::INTEGER,
    COALESCE(array_length(v_insight.affected_engines, 1), 1)
  );
  
  -- Why this ranks #1 (compare to next highest)
  SELECT * INTO v_higher_ranked 
  FROM public.prioritized_insights 
  WHERE user_id = v_insight.user_id 
    AND brand_id = v_insight.brand_id
    AND id != v_insight.id
    AND status IN ('new', 'acknowledged')
  ORDER BY priority_rank DESC
  LIMIT 1;
  
  IF v_higher_ranked IS NOT NULL THEN
    why_rank_one := format(
      'Ranks higher than "%s" because: %s severity (%s vs %s), %s effort for %s%% more upside',
      LEFT(v_higher_ranked.title, 30),
      CASE WHEN v_insight.severity_score > v_higher_ranked.severity_score THEN 'higher' ELSE 'comparable' END,
      v_insight.severity_score,
      v_higher_ranked.severity_score,
      v_insight.estimated_effort,
      GREATEST(0, v_insight.estimated_upside - v_higher_ranked.estimated_upside)
    );
  ELSE
    why_rank_one := 'Only actionable insight for this brand';
  END IF;
  
  -- Update the insight with generated summaries
  UPDATE public.prioritized_insights SET
    single_action_summary = single_action,
    opportunity_cost = opportunity_cost,
    why_rank_one = why_rank_one,
    updated_at = now()
  WHERE id = p_insight_id;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate confidence propagation for a score
CREATE OR REPLACE FUNCTION public.calculate_confidence_propagation(
  p_prompt_id UUID
)
RETURNS TABLE (
  reliability_percentage DECIMAL(5,2),
  confidence_multiplier DECIMAL(5,4),
  degradation_explanation TEXT,
  adjusted_avs INTEGER,
  original_avs INTEGER
) AS $$
DECLARE
  v_engines_expected INTEGER;
  v_engines_healthy INTEGER;
  v_engines_degraded INTEGER;
  v_engines_unavailable INTEGER;
  v_degradation_sources JSONB := '[]';
  v_total_impact DECIMAL(5,4) := 0;
  v_engine RECORD;
  v_score RECORD;
BEGIN
  -- Count expected vs actual engines
  SELECT COUNT(*) INTO v_engines_expected FROM public.engine_authority;
  
  SELECT 
    COUNT(*) FILTER (WHERE status = 'healthy'),
    COUNT(*) FILTER (WHERE status = 'degraded'),
    COUNT(*) FILTER (WHERE status = 'unavailable')
  INTO v_engines_healthy, v_engines_degraded, v_engines_unavailable
  FROM public.engine_authority;
  
  -- Build degradation sources
  FOR v_engine IN 
    SELECT engine, display_name, status, authority_weight 
    FROM public.engine_authority 
    WHERE status != 'healthy'
  LOOP
    v_degradation_sources := v_degradation_sources || jsonb_build_object(
      'engine', v_engine.engine,
      'display_name', v_engine.display_name,
      'reason', v_engine.status,
      'impact', CASE v_engine.status 
        WHEN 'unavailable' THEN v_engine.authority_weight * 0.3
        WHEN 'degraded' THEN v_engine.authority_weight * 0.1
        ELSE 0
      END
    );
    v_total_impact := v_total_impact + CASE v_engine.status 
      WHEN 'unavailable' THEN v_engine.authority_weight * 0.3
      WHEN 'degraded' THEN v_engine.authority_weight * 0.1
      ELSE 0
    END;
  END LOOP;
  
  -- Calculate reliability percentage
  reliability_percentage := GREATEST(0, 100 - (v_total_impact * 100));
  
  -- Calculate confidence multiplier (0.5 to 1.0)
  confidence_multiplier := GREATEST(0.5, 1.0 - v_total_impact);
  
  -- Generate explanation
  IF v_engines_unavailable > 0 THEN
    degradation_explanation := format(
      'This metric is %s%% reliable. %s engine(s) unavailable, %s degraded. Scores use fallback data where needed.',
      ROUND(reliability_percentage),
      v_engines_unavailable,
      v_engines_degraded
    );
  ELSIF v_engines_degraded > 0 THEN
    degradation_explanation := format(
      'This metric is %s%% reliable. %s engine(s) experiencing issues.',
      ROUND(reliability_percentage),
      v_engines_degraded
    );
  ELSE
    degradation_explanation := format('This metric is %s%% reliable. All engines healthy.', ROUND(reliability_percentage));
  END IF;
  
  -- Get current score and calculate adjusted
  SELECT ai_visibility_score INTO original_avs 
  FROM public.prompt_scores 
  WHERE prompt_id = p_prompt_id 
  ORDER BY scored_at DESC LIMIT 1;
  
  original_avs := COALESCE(original_avs, 0);
  adjusted_avs := ROUND(original_avs * confidence_multiplier);
  
  -- Update the score record
  UPDATE public.prompt_scores SET
    reliability_percentage = calculate_confidence_propagation.reliability_percentage,
    confidence_multiplier = calculate_confidence_propagation.confidence_multiplier,
    degradation_explanation = calculate_confidence_propagation.degradation_explanation,
    engines_contributing = v_engines_healthy + v_engines_degraded,
    engines_expected = v_engines_expected
  WHERE prompt_id = p_prompt_id;
  
  -- Log propagation
  INSERT INTO public.confidence_propagation (
    score_type, entity_id, original_value, adjusted_value, 
    confidence_multiplier, degradation_sources, explanation, reliability_percentage
  ) VALUES (
    'avs', p_prompt_id, original_avs, adjusted_avs,
    calculate_confidence_propagation.confidence_multiplier, 
    v_degradation_sources, 
    calculate_confidence_propagation.degradation_explanation,
    calculate_confidence_propagation.reliability_percentage
  );
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get authority change explanation
CREATE OR REPLACE FUNCTION public.explain_authority_change(
  p_engine TEXT,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  change_date TIMESTAMP WITH TIME ZONE,
  change_type TEXT,
  weight_before DECIMAL(5,4),
  weight_after DECIMAL(5,4),
  explanation TEXT,
  evidence JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    created_at,
    aal.change_type,
    previous_authority_weight,
    new_authority_weight,
    aal.explanation,
    aal.evidence
  FROM public.authority_audit_log aal
  WHERE aal.engine = p_engine
    AND created_at > now() - (p_days || ' days')::INTERVAL
  ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_authority_audit_engine ON public.authority_audit_log(engine, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engine_disagreements_prompt ON public.engine_disagreements(prompt_id);
CREATE INDEX IF NOT EXISTS idx_insight_comparisons_user ON public.insight_comparisons(user_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_confidence_propagation_entity ON public.confidence_propagation(entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_assigned ON public.prioritized_insights(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_insights_overdue ON public.prioritized_insights(deadline) WHERE overdue = TRUE;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.authority_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_disagreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_decay_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confidence_propagation ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using DO block to handle existing policies)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view authority audit' AND tablename = 'authority_audit_log') THEN
    CREATE POLICY "Anyone can view authority audit" ON public.authority_audit_log FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view disagreements' AND tablename = 'engine_disagreements') THEN
    CREATE POLICY "Anyone can view disagreements" ON public.engine_disagreements FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view decay rules' AND tablename = 'authority_decay_rules') THEN
    CREATE POLICY "Anyone can view decay rules" ON public.authority_decay_rules FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own comparisons' AND tablename = 'insight_comparisons') THEN
    CREATE POLICY "Users view own comparisons" ON public.insight_comparisons FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view confidence propagation' AND tablename = 'confidence_propagation') THEN
    CREATE POLICY "Anyone can view confidence propagation" ON public.confidence_propagation FOR SELECT USING (true);
  END IF;
END $$;
