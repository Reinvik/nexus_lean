-- PERFORMANCE MIGRATION: Optimize Profiles
-- Run this to reduce "Profile fetch timeout" errors.

BEGIN;

-- 1. Ensure Indexes on Profiles
CREATE INDEX IF NOT EXISTS idx_users_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_users_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_users_profiles_role ON public.profiles(role);

-- 2. Ensure RLS on profiles allows simple reading (Self-correction)
-- This ensures that reading your OWN profile is always fast and allowed.
DROP POLICY IF EXISTS "products_select_policy" ON public.profiles; -- Cleanup typo if exists
DROP POLICY IF EXISTS "profiles_view_own" ON public.profiles;

CREATE POLICY "profiles_view_own" ON public.profiles
FOR SELECT
TO authenticated
USING ( id = auth.uid() );

COMMIT;
