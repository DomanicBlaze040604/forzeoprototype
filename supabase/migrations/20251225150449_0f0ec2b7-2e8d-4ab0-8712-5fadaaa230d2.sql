-- Create competitors table
CREATE TABLE public.competitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_visibility_score NUMERIC DEFAULT 0,
  last_rank INTEGER DEFAULT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Create notification_settings table
CREATE TABLE public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  visibility_threshold INTEGER DEFAULT 70,
  email_enabled BOOLEAN DEFAULT true,
  visibility_drop_alert BOOLEAN DEFAULT true,
  competitor_overtake_alert BOOLEAN DEFAULT true,
  daily_summary_enabled BOOLEAN DEFAULT false,
  weekly_report_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visibility_history table for tracking changes over time
CREATE TABLE public.visibility_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE,
  visibility_score NUMERIC NOT NULL,
  model TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visibility_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for competitors
CREATE POLICY "Users can view own competitors" ON public.competitors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own competitors" ON public.competitors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own competitors" ON public.competitors
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own competitors" ON public.competitors
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for notification_settings
CREATE POLICY "Users can view own notification settings" ON public.notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notification settings" ON public.notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings" ON public.notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for visibility_history
CREATE POLICY "Users can view own visibility history" ON public.visibility_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own visibility history" ON public.visibility_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add trigger for notification_settings updated_at
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();