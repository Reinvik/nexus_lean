-- Migration: Fix Profiles RLS Recursion
-- Description: Updates permissions on public.profiles to use the safe is_admin() function
-- preventing infinite recursion when checking roles.

BEGIN;

-- 1. Drop existing problematic policies
DROP POLICY IF EXISTS "Superadmin view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 2. Create foundational policies

-- A. Self Access (Always allowed)
CREATE POLICY "Profiles visible to self"
ON public.profiles FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Profiles updatable by self"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- B. Superadmin Access (Global)
-- Uses public.is_admin() which is SECURITY DEFINER, bypassing RLS to avoid recursion
CREATE POLICY "Superadmin manage all profiles"
ON public.profiles FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- C. Company Visibility
-- Allow users to see profiles in the same company
CREATE POLICY "Profiles visible to company members"
ON public.profiles FOR SELECT
USING (
    company_id IS NOT NULL 
    AND 
    company_id = (
        SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
);

COMMIT;
