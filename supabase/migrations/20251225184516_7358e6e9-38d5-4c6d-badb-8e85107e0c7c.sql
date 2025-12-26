-- Create serp_history table to track SERP positions over time
CREATE TABLE public.serp_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE,
  location_country TEXT NOT NULL DEFAULT 'US',
  brand_in_serp BOOLEAN DEFAULT false,
  serp_position INTEGER,
  ai_overview_mentioned BOOLEAN DEFAULT false,
  competitor_positions JSONB DEFAULT '[]'::jsonb,
  top_results JSONB DEFAULT '[]'::jsonb,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.serp_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own serp history"
ON public.serp_history
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own serp history"
ON public.serp_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_serp_history_prompt ON public.serp_history(prompt_id, recorded_at DESC);
CREATE INDEX idx_serp_history_brand ON public.serp_history(brand_id, recorded_at DESC);
CREATE INDEX idx_serp_history_location ON public.serp_history(location_country, recorded_at DESC);