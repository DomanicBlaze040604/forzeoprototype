-- Fix security issue: Restrict alerts INSERT to only allow authenticated users to insert their own alerts
-- Drop the overly permissive "System can insert alerts" policy
DROP POLICY IF EXISTS "System can insert alerts" ON public.alerts;

-- Create a proper policy that only allows users to insert alerts for themselves
CREATE POLICY "Users can insert own alerts"
ON public.alerts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- For system-generated alerts (from edge functions), create a service role bypass
-- Edge functions already use the service role key which bypasses RLS

-- Ensure profiles table RLS is properly restrictive
-- Current policies are already user-scoped, but let's add explicit authenticated role requirement

-- Drop and recreate profiles policies with explicit authenticated role
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);