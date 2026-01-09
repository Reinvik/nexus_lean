-- DIAGNOSTIC AND FIX SCRIPT FOR 406 ERRORS
-- Run this in your Supabase SQL Editor to diagnose and fix the profiles table issues

-- 1. Check if profiles table exists and its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Check RLS policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- 3. Verify that RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- 4. Check if there are any profiles
SELECT COUNT(*) as profile_count FROM public.profiles;

-- 5. POTENTIAL FIX: Ensure avatar_url column exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 6. POTENTIAL FIX: Add a more permissive policy for authenticated users to read their own profile
-- This replaces the existing "Ver perfiles" policy with a clearer one
DROP POLICY IF EXISTS "Ver perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
  );

-- 7. Add policy for admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND (role = 'admin' OR email = 'ariel.mellag@gmail.com')
    )
  );

-- 8. Ensure the is_admin function exists and is correct
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND (role = 'admin' OR email = 'ariel.mellag@gmail.com')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.companies TO authenticated;

-- 10. Verify the fix by checking if you can query profiles
-- This should return your profile if logged in
SELECT id, email, name, role, company_id, is_authorized, avatar_url
FROM public.profiles
WHERE id = auth.uid();
