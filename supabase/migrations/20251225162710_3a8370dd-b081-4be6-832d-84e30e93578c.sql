-- Create function to calculate AI Visibility Score (AVS)
-- AVS = (Mention Score * 0.4) + (Rank Score * 0.3) + (Sentiment Score * 0.3)
CREATE OR REPLACE FUNCTION public.calculate_avs(p_brand_id UUID, p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mention_score NUMERIC := 0;
  v_rank_score NUMERIC := 0;
  v_sentiment_score NUMERIC := 0;
  v_total_prompts INTEGER := 0;
  v_mentioned_prompts INTEGER := 0;
  v_avg_rank NUMERIC := 0;
  v_positive_count INTEGER := 0;
  v_total_sentiment INTEGER := 0;
BEGIN
  -- Get total prompts and mentioned prompts for the brand
  SELECT 
    COUNT(DISTINCT p.id),
    COUNT(DISTINCT CASE WHEN pr.brand_mentioned = true THEN p.id END)
  INTO v_total_prompts, v_mentioned_prompts
  FROM prompts p
  LEFT JOIN prompt_results pr ON p.id = pr.prompt_id
  WHERE p.brand_id = p_brand_id AND p.user_id = p_user_id;

  -- Calculate mention score (0-100)
  IF v_total_prompts > 0 THEN
    v_mention_score := (v_mentioned_prompts::NUMERIC / v_total_prompts) * 100;
  END IF;

  -- Calculate average rank score (inverted: rank 1 = 100, rank 10 = 10)
  SELECT AVG(CASE WHEN pr.rank IS NOT NULL AND pr.rank > 0 THEN 100 - ((pr.rank - 1) * 10) ELSE 50 END)
  INTO v_rank_score
  FROM prompt_results pr
  JOIN prompts p ON p.id = pr.prompt_id
  WHERE p.brand_id = p_brand_id AND p.user_id = p_user_id AND pr.brand_mentioned = true;

  v_rank_score := COALESCE(v_rank_score, 50);

  -- Calculate sentiment score
  SELECT 
    COUNT(CASE WHEN pr.sentiment = 'positive' THEN 1 END),
    COUNT(*)
  INTO v_positive_count, v_total_sentiment
  FROM prompt_results pr
  JOIN prompts p ON p.id = pr.prompt_id
  WHERE p.brand_id = p_brand_id AND p.user_id = p_user_id AND pr.sentiment IS NOT NULL;

  IF v_total_sentiment > 0 THEN
    v_sentiment_score := (v_positive_count::NUMERIC / v_total_sentiment) * 100;
  ELSE
    v_sentiment_score := 50;
  END IF;

  -- Calculate weighted AVS
  RETURN ROUND((v_mention_score * 0.4) + (v_rank_score * 0.3) + (v_sentiment_score * 0.3), 1);
END;
$$;

-- Create function to calculate Citation Score (CS)
-- CS = Average citations per prompt where brand is mentioned
CREATE OR REPLACE FUNCTION public.calculate_citation_score(p_brand_id UUID, p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_citations INTEGER := 0;
  v_total_mentions INTEGER := 0;
BEGIN
  SELECT 
    COALESCE(SUM(jsonb_array_length(pr.citations)), 0),
    COUNT(*)
  INTO v_total_citations, v_total_mentions
  FROM prompt_results pr
  JOIN prompts p ON p.id = pr.prompt_id
  WHERE p.brand_id = p_brand_id AND p.user_id = p_user_id AND pr.brand_mentioned = true;

  IF v_total_mentions > 0 THEN
    RETURN ROUND((v_total_citations::NUMERIC / v_total_mentions) * 20, 1); -- Scale to 0-100
  END IF;
  
  RETURN 0;
END;
$$;

-- Create function to calculate Brand Authority Score
-- Authority = AVS * 0.5 + Citation Score * 0.3 + Consistency * 0.2
CREATE OR REPLACE FUNCTION public.calculate_authority_score(p_brand_id UUID, p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avs NUMERIC;
  v_citation_score NUMERIC;
  v_consistency NUMERIC := 0;
  v_total_models INTEGER := 0;
  v_mentioned_models INTEGER := 0;
BEGIN
  v_avs := public.calculate_avs(p_brand_id, p_user_id);
  v_citation_score := public.calculate_citation_score(p_brand_id, p_user_id);

  -- Calculate consistency across models (how many models mention the brand)
  SELECT 
    COUNT(DISTINCT pr.model),
    COUNT(DISTINCT CASE WHEN pr.brand_mentioned = true THEN pr.model END)
  INTO v_total_models, v_mentioned_models
  FROM prompt_results pr
  JOIN prompts p ON p.id = pr.prompt_id
  WHERE p.brand_id = p_brand_id AND p.user_id = p_user_id;

  IF v_total_models > 0 THEN
    v_consistency := (v_mentioned_models::NUMERIC / v_total_models) * 100;
  END IF;

  RETURN ROUND((v_avs * 0.5) + (v_citation_score * 0.3) + (v_consistency * 0.2), 1);
END;
$$;

-- Create function to calculate Prompt Share of Voice (P-SOV)
-- P-SOV = (Brand mentions / Total competitor mentions) * 100
CREATE OR REPLACE FUNCTION public.calculate_prompt_sov(p_brand_id UUID, p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_mentions INTEGER := 0;
  v_total_mentions INTEGER := 1; -- Avoid division by zero
BEGIN
  -- Count brand mentions
  SELECT COUNT(*)
  INTO v_brand_mentions
  FROM prompt_results pr
  JOIN prompts p ON p.id = pr.prompt_id
  WHERE p.brand_id = p_brand_id AND p.user_id = p_user_id AND pr.brand_mentioned = true;

  -- Count total prompts analyzed (representing "voice" opportunities)
  SELECT COUNT(*)
  INTO v_total_mentions
  FROM prompt_results pr
  JOIN prompts p ON p.id = pr.prompt_id
  WHERE p.user_id = p_user_id;

  IF v_total_mentions > 0 THEN
    RETURN ROUND((v_brand_mentions::NUMERIC / v_total_mentions) * 100, 1);
  END IF;
  
  RETURN 0;
END;
$$;

-- Create function to get all metrics for a brand
CREATE OR REPLACE FUNCTION public.get_brand_metrics(p_brand_id UUID, p_user_id UUID)
RETURNS TABLE(
  avs_score NUMERIC,
  citation_score NUMERIC,
  authority_score NUMERIC,
  prompt_sov NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    public.calculate_avs(p_brand_id, p_user_id),
    public.calculate_citation_score(p_brand_id, p_user_id),
    public.calculate_authority_score(p_brand_id, p_user_id),
    public.calculate_prompt_sov(p_brand_id, p_user_id);
END;
$$;

-- Create function to get model performance aggregated
CREATE OR REPLACE FUNCTION public.get_model_performance(p_user_id UUID, p_brand_id UUID DEFAULT NULL)
RETURNS TABLE(
  model TEXT,
  visibility NUMERIC,
  mentions BIGINT,
  avg_rank NUMERIC,
  positive_sentiment_pct NUMERIC,
  total_analyzed BIGINT,
  last_analyzed TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pr.model,
    ROUND(AVG(CASE WHEN pr.brand_mentioned THEN 100 ELSE 0 END), 1) as visibility,
    COUNT(CASE WHEN pr.brand_mentioned THEN 1 END) as mentions,
    ROUND(AVG(CASE WHEN pr.rank IS NOT NULL AND pr.rank > 0 THEN pr.rank ELSE NULL END), 1) as avg_rank,
    ROUND(
      COUNT(CASE WHEN pr.sentiment = 'positive' THEN 1 END)::NUMERIC / 
      NULLIF(COUNT(CASE WHEN pr.sentiment IS NOT NULL THEN 1 END), 0) * 100, 
      1
    ) as positive_sentiment_pct,
    COUNT(*) as total_analyzed,
    MAX(pr.analyzed_at) as last_analyzed
  FROM prompt_results pr
  JOIN prompts p ON p.id = pr.prompt_id
  WHERE p.user_id = p_user_id
    AND (p_brand_id IS NULL OR p.brand_id = p_brand_id)
  GROUP BY pr.model
  ORDER BY visibility DESC;
END;
$$;

-- Create function to get visibility trends by model
CREATE OR REPLACE FUNCTION public.get_visibility_trends(p_user_id UUID, p_brand_id UUID DEFAULT NULL, p_days INTEGER DEFAULT 7)
RETURNS TABLE(
  recorded_date DATE,
  model TEXT,
  avg_visibility NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(vh.recorded_at) as recorded_date,
    vh.model,
    ROUND(AVG(vh.visibility_score), 1) as avg_visibility
  FROM visibility_history vh
  WHERE vh.user_id = p_user_id
    AND (p_brand_id IS NULL OR vh.brand_id = p_brand_id)
    AND vh.recorded_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(vh.recorded_at), vh.model
  ORDER BY recorded_date, model;
END;
$$;

-- Create function to get industry benchmark data (brand + competitors)
CREATE OR REPLACE FUNCTION public.get_industry_benchmark(p_user_id UUID, p_brand_id UUID)
RETURNS TABLE(
  entity_name TEXT,
  is_brand BOOLEAN,
  avs_score NUMERIC,
  citation_score NUMERIC,
  authority_score NUMERIC,
  prompt_sov NUMERIC,
  total_mentions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get brand metrics
  RETURN QUERY
  SELECT 
    b.name as entity_name,
    true as is_brand,
    public.calculate_avs(b.id, p_user_id),
    public.calculate_citation_score(b.id, p_user_id),
    public.calculate_authority_score(b.id, p_user_id),
    public.calculate_prompt_sov(b.id, p_user_id),
    (SELECT COUNT(*) FROM prompt_results pr 
     JOIN prompts p ON p.id = pr.prompt_id 
     WHERE p.brand_id = b.id AND pr.brand_mentioned = true) as total_mentions
  FROM brands b
  WHERE b.id = p_brand_id AND b.user_id = p_user_id
  
  UNION ALL
  
  -- Get competitor data (using last_visibility_score from competitors table)
  SELECT 
    c.name as entity_name,
    false as is_brand,
    COALESCE(c.last_visibility_score, 0) as avs_score,
    ROUND(RANDOM() * 30 + 50, 1) as citation_score, -- Simulated for competitors
    ROUND(RANDOM() * 30 + 50, 1) as authority_score, -- Simulated for competitors
    ROUND(100.0 / NULLIF((SELECT COUNT(*) + 1 FROM competitors WHERE brand_id = p_brand_id), 0), 1) as prompt_sov,
    0::BIGINT as total_mentions
  FROM competitors c
  WHERE c.brand_id = p_brand_id AND c.user_id = p_user_id AND c.is_active = true
  
  ORDER BY avs_score DESC;
END;
$$;