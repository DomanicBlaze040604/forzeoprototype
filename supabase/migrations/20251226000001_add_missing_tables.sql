-- Add API usage tracking for cost control
CREATE TABLE IF NOT EXISTS public.api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_name TEXT NOT NULL,
  action TEXT NOT NULL,
  cost_estimate DECIMAL(10, 6) DEFAULT 0,
  response_time_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add cost alerts table
CREATE TABLE IF NOT EXISTS public.cost_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_limit DECIMAL(10, 2) DEFAULT 10.00,
  monthly_limit DECIMAL(10, 2) DEFAULT 100.00,
  alert_threshold_percent INTEGER DEFAULT 80,
  email_on_threshold BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add prompt grouping fields
ALTER TABLE public.prompts 
ADD COLUMN IF NOT EXISTS intent TEXT CHECK (intent IN ('informational', 'navigational', 'transactional', 'commercial')),
ADD COLUMN IF NOT EXISTS funnel_stage TEXT CHECK (funnel_stage IN ('awareness', 'consideration', 'decision', 'retention')),
ADD COLUMN IF NOT EXISTS topic_cluster TEXT,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Add job queue table for orchestration
CREATE TABLE IF NOT EXISTS public.job_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  priority INTEGER DEFAULT 0,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add scoring algorithm versions table
CREATE TABLE IF NOT EXISTS public.scoring_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  algorithm_config JSONB NOT NULL DEFAULT '{}',
  weights JSONB NOT NULL DEFAULT '{"visibility": 0.4, "citations": 0.3, "sentiment": 0.2, "rank": 0.1}',
  is_active BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default scoring version
INSERT INTO public.scoring_versions (version, algorithm_config, weights, is_active, description)
VALUES (
  'v1.0.0',
  '{"mention_weight": 1.0, "rank_decay": 0.1, "sentiment_multiplier": {"positive": 1.2, "neutral": 1.0, "negative": 0.8}}',
  '{"visibility": 0.4, "citations": 0.3, "sentiment": 0.2, "rank": 0.1}',
  true,
  'Initial scoring algorithm'
) ON CONFLICT (version) DO NOTHING;

-- Add user roles table for RBAC
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'analyst', 'user', 'viewer')),
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Add workspaces for agency multi-brand support
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add workspace members
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Link brands to workspaces
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- Add engine-specific results table
CREATE TABLE IF NOT EXISTS public.engine_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  engine TEXT NOT NULL CHECK (engine IN ('google_ai_mode', 'chatgpt', 'perplexity', 'bing_copilot', 'gemini', 'claude')),
  raw_response JSONB,
  parsed_response JSONB,
  brand_mentioned BOOLEAN DEFAULT false,
  brand_position INTEGER,
  citations JSONB DEFAULT '[]',
  entities JSONB DEFAULT '[]',
  sentiment TEXT,
  confidence_score DECIMAL(5, 2),
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add URL-level citation tracking
CREATE TABLE IF NOT EXISTS public.url_citations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  citation_count INTEGER DEFAULT 1,
  engines JSONB DEFAULT '[]',
  prompts JSONB DEFAULT '[]',
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verification_status TEXT DEFAULT 'pending',
  trust_score DECIMAL(5, 2) DEFAULT 50,
  UNIQUE(user_id, url)
);

-- Enable RLS on new tables
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engine_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.url_citations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using DO block to handle existing policies)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own api usage' AND tablename = 'api_usage') THEN
    CREATE POLICY "Users can view own api usage" ON public.api_usage FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own api usage' AND tablename = 'api_usage') THEN
    CREATE POLICY "Users can insert own api usage" ON public.api_usage FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own cost alerts' AND tablename = 'cost_alerts') THEN
    CREATE POLICY "Users can manage own cost alerts" ON public.cost_alerts FOR ALL USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own jobs' AND tablename = 'job_queue') THEN
    CREATE POLICY "Users can view own jobs" ON public.job_queue FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create own jobs' AND tablename = 'job_queue') THEN
    CREATE POLICY "Users can create own jobs" ON public.job_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own jobs' AND tablename = 'job_queue') THEN
    CREATE POLICY "Users can update own jobs" ON public.job_queue FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view scoring versions' AND tablename = 'scoring_versions') THEN
    CREATE POLICY "Anyone can view scoring versions" ON public.scoring_versions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own role' AND tablename = 'user_roles') THEN
    CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own workspaces' AND tablename = 'workspaces') THEN
    CREATE POLICY "Users can view own workspaces" ON public.workspaces FOR SELECT USING (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own workspaces' AND tablename = 'workspaces') THEN
    CREATE POLICY "Users can manage own workspaces" ON public.workspaces FOR ALL USING (auth.uid() = owner_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can view workspace' AND tablename = 'workspace_members') THEN
    CREATE POLICY "Members can view workspace" ON public.workspace_members FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view engine results via prompts' AND tablename = 'engine_results') THEN
    CREATE POLICY "Users can view engine results via prompts" ON public.engine_results FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.prompts WHERE prompts.id = engine_results.prompt_id AND prompts.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert engine results via prompts' AND tablename = 'engine_results') THEN
    CREATE POLICY "Users can insert engine results via prompts" ON public.engine_results FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.prompts WHERE prompts.id = engine_results.prompt_id AND prompts.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own url citations' AND tablename = 'url_citations') THEN
    CREATE POLICY "Users can manage own url citations" ON public.url_citations FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_user_date ON public.api_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON public.job_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_job_queue_user ON public.job_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_engine_results_prompt ON public.engine_results(prompt_id, engine);
CREATE INDEX IF NOT EXISTS idx_url_citations_domain ON public.url_citations(domain, citation_count DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_intent ON public.prompts(intent, funnel_stage);

-- Function to get daily API cost
CREATE OR REPLACE FUNCTION public.get_daily_api_cost(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(cost_estimate), 0)
  FROM public.api_usage
  WHERE user_id = p_user_id
    AND DATE(created_at) = p_date;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to get monthly API cost
CREATE OR REPLACE FUNCTION public.get_monthly_api_cost(p_user_id UUID, p_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE)
RETURNS DECIMAL AS $$
  SELECT COALESCE(SUM(cost_estimate), 0)
  FROM public.api_usage
  WHERE user_id = p_user_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', p_month);
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to process job queue
CREATE OR REPLACE FUNCTION public.get_next_job(p_job_types TEXT[] DEFAULT NULL)
RETURNS public.job_queue AS $$
DECLARE
  v_job public.job_queue;
BEGIN
  SELECT * INTO v_job
  FROM public.job_queue
  WHERE status = 'pending'
    AND scheduled_for <= NOW()
    AND (p_job_types IS NULL OR job_type = ANY(p_job_types))
  ORDER BY priority DESC, scheduled_for ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF v_job.id IS NOT NULL THEN
    UPDATE public.job_queue
    SET status = 'processing', started_at = NOW()
    WHERE id = v_job.id;
  END IF;
  
  RETURN v_job;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
