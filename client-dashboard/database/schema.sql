-- ============================================
-- Forzeo Client Dashboard - Database Schema
-- ============================================
-- 
-- This schema supports multi-tenant SaaS with:
-- - Organizations (tenants)
-- - Clients (brands being tracked)
-- - Prompts (search queries)
-- - Audit results (visibility analysis)
-- 
-- NOTE: The current implementation uses localStorage for persistence.
-- This schema is provided for upgrading to database storage.
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ORGANIZATIONS (Tenants)
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',  -- free, pro, enterprise
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CLIENTS (Brands)
-- ============================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  brand_tags TEXT[] DEFAULT '{}',
  slug TEXT NOT NULL,
  target_region TEXT DEFAULT 'United States',
  location_code INTEGER DEFAULT 2840,
  industry TEXT DEFAULT 'Custom',
  competitors TEXT[] DEFAULT '{}',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, slug)
);

-- Index for fast client lookup
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);

-- ============================================
-- PROMPTS
-- ============================================

CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  category TEXT DEFAULT 'custom',  -- default, custom, imported
  is_custom BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast prompt lookup by client
CREATE INDEX IF NOT EXISTS idx_prompts_client ON prompts(client_id);

-- ============================================
-- AUDIT RESULTS
-- ============================================

CREATE TABLE IF NOT EXISTS audit_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  prompt_text TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  brand_tags TEXT[] DEFAULT '{}',
  competitors TEXT[] DEFAULT '{}',
  models_used TEXT[] DEFAULT '{}',
  
  -- Summary metrics
  share_of_voice INTEGER DEFAULT 0,
  average_rank DECIMAL(3,1),
  total_citations INTEGER DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  
  -- Detailed results (JSONB for flexibility)
  model_results JSONB DEFAULT '[]',
  top_sources JSONB DEFAULT '[]',
  top_competitors JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit results
CREATE INDEX IF NOT EXISTS idx_audit_client ON audit_results(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_prompt ON audit_results(prompt_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_results(created_at DESC);

-- ============================================
-- CITATIONS (Denormalized for fast queries)
-- ============================================

CREATE TABLE IF NOT EXISTS citations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_result_id UUID REFERENCES audit_results(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  domain TEXT NOT NULL,
  position INTEGER,
  snippet TEXT,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for citations
CREATE INDEX IF NOT EXISTS idx_citations_audit ON citations(audit_result_id);
CREATE INDEX IF NOT EXISTS idx_citations_client ON citations(client_id);
CREATE INDEX IF NOT EXISTS idx_citations_domain ON citations(domain);

-- ============================================
-- API USAGE TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  api_name TEXT NOT NULL,  -- dataforseo_serp, dataforseo_ai, groq
  cost DECIMAL(10,6) DEFAULT 0,
  request_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for usage tracking
CREATE INDEX IF NOT EXISTS idx_usage_org ON api_usage(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_date ON api_usage(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- SAMPLE DATA (Optional)
-- ============================================

-- Uncomment to insert sample organization and clients

/*
INSERT INTO organizations (id, name, slug, plan) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Forzeo Demo', 'forzeo-demo', 'pro');

INSERT INTO clients (organization_id, name, brand_name, brand_tags, slug, target_region, location_code, industry, competitors, primary_color) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Juleo Club', 'Juleo', ARRAY['Juleo Club', 'Trusted Singles Club'], 'juleo', 'India', 2356, 'Dating/Matrimony', ARRAY['Bumble', 'Hinge', 'Tinder', 'Shaadi'], '#ec4899'),
  ('00000000-0000-0000-0000-000000000001', 'Jagota', 'Jagota', ARRAY['Jagota Brothers', 'Jagota Group'], 'jagota', 'Thailand', 2764, 'Food/Beverage', ARRAY['Sysco', 'US Foods', 'Makro'], '#f59e0b'),
  ('00000000-0000-0000-0000-000000000001', 'Post House Dental', 'Post House Dental', ARRAY['Post House', 'PHD Surrey'], 'post-house-dental', 'Surrey, UK', 2826, 'Healthcare/Dental', ARRAY['Bupa Dental', 'MyDentist'], '#06b6d4'),
  ('00000000-0000-0000-0000-000000000001', 'Shoptheyn', 'Shoptheyn', ARRAY['Shop Theyn', 'Theyn Fashion'], 'shoptheyn', 'India', 2356, 'E-commerce/Fashion', ARRAY['Myntra', 'Ajio', 'Amazon Fashion'], '#8b5cf6');
*/
