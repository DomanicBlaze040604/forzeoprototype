-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable realtime for prompt_results table
ALTER PUBLICATION supabase_realtime ADD TABLE public.prompt_results;

-- Create function to insert visibility drop alerts
CREATE OR REPLACE FUNCTION public.check_visibility_drop()
RETURNS TRIGGER AS $$
DECLARE
  v_threshold INTEGER;
  v_previous_score NUMERIC;
  v_brand_name TEXT;
  v_email_enabled BOOLEAN;
  v_drop_alert_enabled BOOLEAN;
BEGIN
  -- Get user's notification settings
  SELECT visibility_threshold, email_enabled, visibility_drop_alert
  INTO v_threshold, v_email_enabled, v_drop_alert_enabled
  FROM notification_settings
  WHERE user_id = NEW.user_id;

  -- Default threshold if not set
  v_threshold := COALESCE(v_threshold, 70);

  -- Only proceed if alerts are enabled
  IF v_email_enabled = true AND v_drop_alert_enabled = true THEN
    -- Get previous visibility score for this prompt
    SELECT visibility_score INTO v_previous_score
    FROM visibility_history
    WHERE user_id = NEW.user_id
      AND prompt_id = NEW.prompt_id
      AND recorded_at < NEW.recorded_at
    ORDER BY recorded_at DESC
    LIMIT 1;

    -- Get brand name
    SELECT name INTO v_brand_name
    FROM brands
    WHERE id = NEW.brand_id;

    -- Check if visibility dropped below threshold
    IF v_previous_score IS NOT NULL 
       AND v_previous_score >= v_threshold 
       AND NEW.visibility_score < v_threshold THEN
      -- Insert alert
      INSERT INTO alerts (user_id, type, title, message, severity, data)
      VALUES (
        NEW.user_id,
        'visibility_drop',
        'Visibility Drop Detected',
        'Your brand visibility dropped from ' || ROUND(v_previous_score, 1) || '% to ' || ROUND(NEW.visibility_score, 1) || '% (below ' || v_threshold || '% threshold)',
        'critical',
        jsonb_build_object(
          'brand_name', v_brand_name,
          'previous_score', v_previous_score,
          'current_score', NEW.visibility_score,
          'threshold', v_threshold,
          'prompt_id', NEW.prompt_id
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for visibility drop detection
DROP TRIGGER IF EXISTS on_visibility_history_insert ON visibility_history;
CREATE TRIGGER on_visibility_history_insert
  AFTER INSERT ON visibility_history
  FOR EACH ROW
  EXECUTE FUNCTION check_visibility_drop();

-- Add RLS policy for alerts INSERT (system can create alerts)
CREATE POLICY "System can insert alerts" ON public.alerts
FOR INSERT
WITH CHECK (true);