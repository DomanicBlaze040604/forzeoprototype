-- Add SLA enforcement fields to prioritized_insights
ALTER TABLE public.prioritized_insights
ADD COLUMN IF NOT EXISTS overdue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escalation_count INTEGER DEFAULT 0;

-- Create index for SLA queries
CREATE INDEX IF NOT EXISTS idx_insights_sla ON public.prioritized_insights(deadline, status, overdue)
WHERE deadline IS NOT NULL;

-- Function to check and mark overdue insights (can be called by cron)
CREATE OR REPLACE FUNCTION public.enforce_sla_deadlines()
RETURNS TABLE (
  insight_id UUID,
  title TEXT,
  hours_overdue INTEGER
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.prioritized_insights
  SET 
    overdue = true,
    escalated_at = NOW(),
    escalation_count = escalation_count + 1,
    updated_at = NOW()
  WHERE 
    deadline < NOW()
    AND status IN ('pending', 'acknowledged', 'in_progress')
    AND overdue = false
    AND deadline IS NOT NULL
  RETURNING 
    id AS insight_id,
    prioritized_insights.title,
    EXTRACT(EPOCH FROM (NOW() - deadline))::INTEGER / 3600 AS hours_overdue;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get SLA compliance stats
CREATE OR REPLACE FUNCTION public.get_sla_compliance_stats(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_with_sla BIGINT,
  completed_on_time BIGINT,
  completed_late BIGINT,
  still_overdue BIGINT,
  compliance_rate NUMERIC
) AS $$
DECLARE
  v_start_date TIMESTAMP WITH TIME ZONE := NOW() - (p_days || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE deadline IS NOT NULL) AS total_with_sla,
    COUNT(*) FILTER (WHERE status = 'completed' AND completed_at <= deadline) AS completed_on_time,
    COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > deadline) AS completed_late,
    COUNT(*) FILTER (WHERE overdue = true AND status != 'completed') AS still_overdue,
    CASE 
      WHEN COUNT(*) FILTER (WHERE deadline IS NOT NULL) > 0 
      THEN ROUND(
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at <= deadline)::NUMERIC / 
        COUNT(*) FILTER (WHERE deadline IS NOT NULL) * 100, 
        1
      )
      ELSE 100
    END AS compliance_rate
  FROM public.prioritized_insights
  WHERE user_id = p_user_id
    AND created_at >= v_start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining SLA enforcement
COMMENT ON FUNCTION public.enforce_sla_deadlines() IS 
'Marks insights as overdue when their deadline has passed. Should be called periodically (e.g., hourly via cron or scheduled Edge Function).';
