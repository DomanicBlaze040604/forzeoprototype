-- Create analysis_jobs table for tracking real-time analysis tasks
CREATE TABLE public.analysis_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  model TEXT NOT NULL,
  persona TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'pending',
  brand_mentioned BOOLEAN,
  sentiment TEXT,
  accuracy INTEGER,
  reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.analysis_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own analysis jobs"
ON public.analysis_jobs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analysis jobs"
ON public.analysis_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis jobs"
ON public.analysis_jobs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis jobs"
ON public.analysis_jobs FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for analysis_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_jobs;

-- Create scheduled_reports table for comparison reports
CREATE TABLE public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL DEFAULT 'daily',
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  personas TEXT[] DEFAULT ARRAY['General User', 'CTO', 'Developer', 'Student', 'Investor'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own scheduled reports"
ON public.scheduled_reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own scheduled reports"
ON public.scheduled_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled reports"
ON public.scheduled_reports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled reports"
ON public.scheduled_reports FOR DELETE
USING (auth.uid() = user_id);