-- EMERGENCY FIX: Infinite Recursion on Profiles
-- This migration forcibly removes ALL existing policies on the 'profiles' table
-- and replaces them with simple, non-recursive ones.

BEGIN;

-- 1. Drop ALL existing policies on profiles (Dynamic approach to catch hidden/renamed ones)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- 2. Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create SIMPLE, SAFE policies (No cross-table lookups, no functions)
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING ( id = auth.uid() );

CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK ( id = auth.uid() );

CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING ( id = auth.uid() );

-- 4. Ensure Service Role can do everything (just in case)
-- (Service role bypasses RLS by default, but good to be clean)

COMMIT;
