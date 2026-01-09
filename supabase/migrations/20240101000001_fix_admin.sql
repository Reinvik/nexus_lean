-- FIX SCRIPT: Elevate User to Superadmin and Fix Permissions
-- Run this in your Supabase SQL Editor or via psql

BEGIN;

-- 1. Upgrade Ariel to Superadmin and Unbind from CIAL
UPDATE public.profiles
SET role = 'superadmin', company_id = NULL
WHERE email = 'ariel.mellag@gmail.com';

-- 2. Ensure RLS Policies allow Superadmin to see everything
-- We update or create policies for key tables

-- 2.1 Profiles Policy
DROP POLICY IF EXISTS "Superadmin view all profiles" ON public.profiles;
CREATE POLICY "Superadmin view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
);

-- 2.2 Companies Policy
DROP POLICY IF EXISTS "Superadmin view all companies" ON public.companies;
CREATE POLICY "Superadmin view all companies"
ON public.companies FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
);

DROP POLICY IF EXISTS "Superadmin manage companies" ON public.companies;
CREATE POLICY "Superadmin manage companies"
ON public.companies FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
);

-- 2.3 5S Cards Policy
DROP POLICY IF EXISTS "Superadmin select all cards" ON public.five_s_cards;
CREATE POLICY "Superadmin select all cards"
ON public.five_s_cards FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin'
);

COMMIT;

SELECT * FROM public.profiles WHERE email = 'ariel.mellag@gmail.com';
