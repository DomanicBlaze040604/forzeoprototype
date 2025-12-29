-- Forzeo Multi-Tenant SaaS Schema
-- Supports 4 pilot clients with data isolation

-- 1. Clients/Tenants Table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-safe identifier
  target_region TEXT NOT NULL,
  location_code INTEGER NOT NULL, -- DataForSEO location code
  industry TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Client Users (for multi-tenant auth)
CREATE TABLE IF NOT EXISTS client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Prompts Table (tenant-isolated)
CREATE TABLE IF NOT EXISTS client_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  category TEXT, -- e.g., 'brand_awareness', 'comparison', 'feature'
  is_custom BOOLEAN DEFAULT false, -- true if added by client
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES client_users(id)
);

-- 4. Audit Results (main data table)
CREATE TABLE IF NOT EXISTS audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  prompt_id UUID NOT NULL REFERENCES client_prompts(id) ON DELETE CASCADE,
  model TEXT NOT NULL CHECK (model IN ('chatgpt', 'perplexity', 'google_ai_overview')),
  
  -- Response data
  raw_response TEXT,
  response_length INTEGER,
  
  -- Brand detection
  brand_mentioned BOOLEAN DEFAULT false,
  brand_mention_count INTEGER DEFAULT 0,
  brand_rank INTEGER, -- Position in list if applicable
  brand_sentiment TEXT CHECK (brand_sentiment IN ('positive', 'neutral', 'negative')),
  
  -- Winner analysis
  winner_brand TEXT, -- Top recommended brand
  
  -- Competitor data (JSONB for flexibility)
  competitors_found JSONB DEFAULT '[]', -- [{name, count, rank, sentiment}]
  
  -- Citations
  citations JSONB DEFAULT '[]', -- [{url, title, domain, position}]
  citation_count INTEGER DEFAULT 0,
  
  -- Metadata
  api_cost DECIMAL(10, 6),
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Source/Citation Summary (aggregated)
CREATE TABLE IF NOT EXISTS citation_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  full_url TEXT,
  citation_count INTEGER DEFAULT 1,
  prompt_ids UUID[] DEFAULT '{}', -- Array of prompts that cited this
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, full_url)
);

-- 6. Audit Sessions (for batch runs)
CREATE TABLE IF NOT EXISTS audit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_prompts INTEGER DEFAULT 0,
  completed_prompts INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 4) DEFAULT 0,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  created_by UUID REFERENCES client_users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_results_client ON audit_results(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_prompt ON audit_results(prompt_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_model ON audit_results(model);
CREATE INDEX IF NOT EXISTS idx_client_prompts_client ON client_prompts(client_id);
CREATE INDEX IF NOT EXISTS idx_citation_summary_client ON citation_summary(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_client ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_email ON client_users(email);

-- Row Level Security (RLS) for multi-tenancy
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_sessions ENABLE ROW LEVEL SECURITY;

-- Insert the 4 pilot clients
INSERT INTO clients (name, brand_name, slug, target_region, location_code, industry) VALUES
  ('Juleo Club', 'Juleo', 'juleo', 'India', 2356, 'Dating/Matrimony'),
  ('Jagota', 'Jagota', 'jagota', 'Thailand', 2764, 'Food/Beverage'),
  ('Post House Dental', 'Post House Dental', 'post-house-dental', 'Surrey, UK', 2826, 'Healthcare/Dental'),
  ('Shoptheyn', 'Shoptheyn', 'shoptheyn', 'India', 2356, 'E-commerce/Fashion')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample prompts for each client
-- Juleo (Dating)
INSERT INTO client_prompts (client_id, prompt_text, category) 
SELECT id, prompt, 'brand_awareness' FROM clients, 
  (VALUES 
    ('Best dating apps in India 2025'),
    ('Dating apps with government ID verification India'),
    ('Alternatives to Shaadi.com for modern professionals'),
    ('Dating apps for serious relationships in India'),
    ('What is Trusted Singles Club in dating apps?')
  ) AS prompts(prompt)
WHERE slug = 'juleo';

-- Jagota (Food/Beverage Thailand)
INSERT INTO client_prompts (client_id, prompt_text, category)
SELECT id, prompt, 'brand_awareness' FROM clients,
  (VALUES
    ('Best food distributors in Thailand'),
    ('Premium beverage suppliers Bangkok'),
    ('Top FMCG companies in Thailand 2025'),
    ('Food import companies Thailand'),
    ('Best wholesale food suppliers Southeast Asia')
  ) AS prompts(prompt)
WHERE slug = 'jagota';

-- Post House Dental (Healthcare UK)
INSERT INTO client_prompts (client_id, prompt_text, category)
SELECT id, prompt, 'brand_awareness' FROM clients,
  (VALUES
    ('Best dental clinic in Surrey UK'),
    ('Top dentists near Guildford'),
    ('Private dental practice Surrey reviews'),
    ('Emergency dentist Surrey UK'),
    ('Cosmetic dentistry Surrey recommendations')
  ) AS prompts(prompt)
WHERE slug = 'post-house-dental';

-- Shoptheyn (E-commerce India)
INSERT INTO client_prompts (client_id, prompt_text, category)
SELECT id, prompt, 'brand_awareness' FROM clients,
  (VALUES
    ('Best online fashion stores India'),
    ('Affordable trendy clothing India'),
    ('Top e-commerce fashion brands India 2025'),
    ('Where to buy stylish clothes online India'),
    ('Best Instagram fashion stores India')
  ) AS prompts(prompt)
WHERE slug = 'shoptheyn';
