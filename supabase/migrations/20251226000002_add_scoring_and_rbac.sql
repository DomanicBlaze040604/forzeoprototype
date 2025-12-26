-- Add prompt scores table for storing calculated scores
CREATE TABLE IF NOT EXISTS public.prompt_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.prompts(id) ON DELETE CASCADE,
  ai_visibility_score INTEGER DEFAULT 0,
  citation_score INTEGER DEFAULT 0,
  brand_authority_score INTEGER DEFAULT 0,
  share_of_voice INTEGER DEFAULT 0,
  breakdown JSONB DEFAULT '[]',
  scoring_version TEXT DEFAULT 'v1.0.0',
  confidence INTEGER DEFAULT 0,
  scored_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(prompt_id, scoring_version)
);

-- Add organizations table for multi-tenant hierarchy
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add organization members with RBAC
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'analyst', 'viewer')),
  permissions JSONB DEFAULT '[]',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Add projects within workspaces
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Link workspaces to organizations
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Link brands to projects
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add brand aliases and domains
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS domains TEXT[] DEFAULT '{}';

-- Enable RLS on new tables
ALTER TABLE public.prompt_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using DO block to handle existing policies)
DO $$ BEGIN
  -- prompt_scores policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view scores via prompts' AND tablename = 'prompt_scores') THEN
    CREATE POLICY "Users can view scores via prompts" ON public.prompt_scores FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.prompts WHERE prompts.id = prompt_scores.prompt_id AND prompts.user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert scores via prompts' AND tablename = 'prompt_scores') THEN
    CREATE POLICY "Users can insert scores via prompts" ON public.prompt_scores FOR INSERT
      WITH CHECK (EXISTS (SELECT 1 FROM public.prompts WHERE prompts.id = prompt_scores.prompt_id AND prompts.user_id = auth.uid()));
  END IF;
  -- organizations policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own organizations' AND tablename = 'organizations') THEN
    CREATE POLICY "Users can view own organizations" ON public.organizations FOR SELECT
      USING (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.organization_members WHERE organization_id = organizations.id AND user_id = auth.uid()
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owners can manage organizations' AND tablename = 'organizations') THEN
    CREATE POLICY "Owners can manage organizations" ON public.organizations FOR ALL
      USING (owner_id = auth.uid());
  END IF;
  -- organization_members policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Members can view organization members' AND tablename = 'organization_members') THEN
    CREATE POLICY "Members can view organization members" ON public.organization_members FOR SELECT
      USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.organizations WHERE id = organization_members.organization_id AND owner_id = auth.uid()
      ));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage members' AND tablename = 'organization_members') THEN
    CREATE POLICY "Admins can manage members" ON public.organization_members FOR ALL
      USING (EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
      ));
  END IF;
  -- projects policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace members can view projects' AND tablename = 'projects') THEN
    CREATE POLICY "Workspace members can view projects" ON public.projects FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.workspace_members wm
        WHERE wm.workspace_id = projects.workspace_id AND wm.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Function to upsert URL citations
CREATE OR REPLACE FUNCTION public.upsert_url_citation(
  p_user_id UUID,
  p_url TEXT,
  p_domain TEXT,
  p_engine TEXT,
  p_prompt_id TEXT
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.url_citations (user_id, url, domain, engines, prompts, citation_count, last_seen_at)
  VALUES (
    p_user_id,
    p_url,
    p_domain,
    jsonb_build_array(p_engine),
    jsonb_build_array(p_prompt_id),
    1,
    NOW()
  )
  ON CONFLICT (user_id, url) DO UPDATE SET
    citation_count = url_citations.citation_count + 1,
    engines = CASE
      WHEN NOT url_citations.engines ? p_engine
      THEN url_citations.engines || jsonb_build_array(p_engine)
      ELSE url_citations.engines
    END,
    prompts = CASE
      WHEN NOT url_citations.prompts ? p_prompt_id
      THEN url_citations.prompts || jsonb_build_array(p_prompt_id)
      ELSE url_citations.prompts
    END,
    last_seen_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user role in organization
CREATE OR REPLACE FUNCTION public.check_org_permission(
  p_user_id UUID,
  p_organization_id UUID,
  p_required_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_role_hierarchy TEXT[] := ARRAY['viewer', 'analyst', 'admin', 'owner'];
BEGIN
  SELECT role INTO v_user_role
  FROM public.organization_members
  WHERE organization_id = p_organization_id AND user_id = p_user_id;
  
  IF v_user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN array_position(v_role_hierarchy, v_user_role) >= array_position(v_role_hierarchy, p_required_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organizations with role
CREATE OR REPLACE FUNCTION public.get_user_organizations(p_user_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  role TEXT,
  member_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    om.role,
    (SELECT COUNT(*) FROM public.organization_members WHERE organization_id = o.id)
  FROM public.organizations o
  JOIN public.organization_members om ON o.id = om.organization_id
  WHERE om.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_scores_prompt ON public.prompt_scores(prompt_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON public.projects(workspace_id);
