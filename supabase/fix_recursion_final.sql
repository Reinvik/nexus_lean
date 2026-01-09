-- CRITICAL FIX: Infinite Recursion on 'profiles' table
-- Run this script in the Supabase SQL Editor to retore access to data.

BEGIN;

-- 1. Disable RLS temporarily to ensure we can modify policies without locking issues
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies on profiles (Dynamic approach)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- 3. Re-enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Create ONE simple, non-recursive policy
-- "Users can see and edit their own profile"
CREATE POLICY "profiles_own_access"
ON public.profiles
FOR ALL
TO authenticated
USING ( id = auth.uid() )
WITH CHECK ( id = auth.uid() );

-- 5. Grant permissions just in case
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

COMMIT;
