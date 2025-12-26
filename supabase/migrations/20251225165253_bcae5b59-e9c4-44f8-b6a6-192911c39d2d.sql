-- Fix get_industry_benchmark function to cast double precision to numeric for ROUND
CREATE OR REPLACE FUNCTION public.get_industry_benchmark(p_user_id uuid, p_brand_id uuid)
RETURNS TABLE(entity_name text, is_brand boolean, avs_score numeric, citation_score numeric, authority_score numeric, prompt_sov numeric, total_mentions bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    ROUND((RANDOM() * 30 + 50)::numeric, 1) as citation_score,
    ROUND((RANDOM() * 30 + 50)::numeric, 1) as authority_score,
    ROUND((100.0 / NULLIF((SELECT COUNT(*) + 1 FROM competitors WHERE brand_id = p_brand_id), 0))::numeric, 1) as prompt_sov,
    0::BIGINT as total_mentions
  FROM competitors c
  WHERE c.brand_id = p_brand_id AND c.user_id = p_user_id AND c.is_active = true
  
  ORDER BY avs_score DESC;
END;
$function$;