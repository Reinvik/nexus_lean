-- Migration: Fix Profiles Recursion (Final)
-- Description: The previous fix addressed is_admin, but the "company members" policy 
-- still caused recursion by querying public.profiles inside the policy.
-- Solution: Use a SECURITY DEFINER function to fetch the user's company_id without triggering RLS.

BEGIN;

-- 1. Create Helper Function (Bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop Problematic Policy
DROP POLICY IF EXISTS "Profiles visible to company members" ON public.profiles;

-- 3. Re-create Policy using Safe Function
CREATE POLICY "Profiles visible to company members"
ON public.profiles FOR SELECT
USING (
    company_id IS NOT NULL 
    AND 
    company_id = public.get_my_company_id()
);

COMMIT;
