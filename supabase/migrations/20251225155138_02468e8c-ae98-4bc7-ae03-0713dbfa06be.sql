-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table for storing citation embeddings and verification results
CREATE TABLE public.citation_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_url TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  source_content TEXT,
  claim_embedding vector(384),
  source_embedding vector(384),
  similarity_score NUMERIC,
  verification_status TEXT DEFAULT 'pending',
  hallucination_risk TEXT DEFAULT 'unknown',
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.citation_verifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own verifications"
  ON public.citation_verifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own verifications"
  ON public.citation_verifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verifications"
  ON public.citation_verifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for vector similarity search
CREATE INDEX ON public.citation_verifications USING ivfflat (claim_embedding vector_cosine_ops) WITH (lists = 100);

-- Add verification columns to sources table
ALTER TABLE public.sources 
ADD COLUMN IF NOT EXISTS hallucination_risk TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS content_hash TEXT;