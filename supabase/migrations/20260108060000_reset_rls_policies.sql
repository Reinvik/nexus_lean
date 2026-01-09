-- AGGRESSIVE RLS RESET & PERFORMANCE FIX
-- Goal: Fix "Error al guardar la auditoría" AND "Responsables Isolation/Performance"
-- We introduce a SECURITY DEFINER function to break recursion limits and allow safe company_id lookup.

BEGIN;

-----------------------------------------------------------------------
-- 1. HELPER FUNCTION (Anti-Recursion / Performance)
-----------------------------------------------------------------------
-- API to get current user's company_id quickly and safely without RLS.
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner to bypass RLS on profiles
SET search_path = public -- Secure search path
AS $$
DECLARE
    v_company_id uuid;
BEGIN
    SELECT company_id INTO v_company_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN v_company_id;
END;
$$;

-----------------------------------------------------------------------
-- 2. CLEANUP: Drop ALL known policies to avoid conflicts
-----------------------------------------------------------------------

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles from their company" ON public.profiles;

-- AUDIT_5S
DROP POLICY IF EXISTS "Users can view audits from their company" ON public.audit_5s;
DROP POLICY IF EXISTS "Users can insert audits for their company" ON public.audit_5s;
DROP POLICY IF EXISTS "Users can update audits from their company" ON public.audit_5s;
DROP POLICY IF EXISTS "Users can delete audits from their company" ON public.audit_5s;
DROP POLICY IF EXISTS "Authenticated users can manage audits" ON public.audit_5s; 

-- AUDIT_5S_ENTRIES
DROP POLICY IF EXISTS "Users can view entries from their company's audits" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "Users can insert entries for their company's audits" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "Users can update entries from their company's audits" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "Users can delete entries from their company's audits" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "Authenticated users can manage audit entries" ON public.audit_5s_entries; 
DROP POLICY IF EXISTS "Users can view entries from their company" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "Users can manage entries from their company" ON public.audit_5s_entries;

-----------------------------------------------------------------------
-- 3. PROFILE POLICIES (Base Truth)
-----------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view themselves AND other users in the SAME company.
-- This is critical for "Responsables" module visibility.
CREATE POLICY "Users can view profiles from their company"
ON public.profiles FOR SELECT TO authenticated
USING ( 
    id = auth.uid() OR 
    company_id = public.get_user_company_id() 
);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK ( id = auth.uid() );

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING ( id = auth.uid() );

-----------------------------------------------------------------------
-- 4. AUDIT POLICIES (Optimized with Function)
-----------------------------------------------------------------------
-- Use get_user_company_id() for massive performance gain vs subqueries

CREATE POLICY "Users can view audits from their company"
  ON public.audit_5s FOR SELECT
  USING ( company_id = public.get_user_company_id() );

CREATE POLICY "Users can insert audits for their company"
  ON public.audit_5s FOR INSERT
  WITH CHECK ( company_id = public.get_user_company_id() );

CREATE POLICY "Users can update audits from their company"
  ON public.audit_5s FOR UPDATE
  USING ( company_id = public.get_user_company_id() );

CREATE POLICY "Users can delete audits from their company"
  ON public.audit_5s FOR DELETE
  USING ( company_id = public.get_user_company_id() );

-----------------------------------------------------------------------
-- 5. AUDIT ENTRIES POLICIES
-----------------------------------------------------------------------
-- RLS on related table usually requires a join or EXISTS.
-- We can check if the parent audit belongs to our company.

CREATE POLICY "Users can manage entries from their company"
  ON public.audit_5s_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_5s 
      WHERE audit_5s.id = audit_5s_entries.audit_id
      AND audit_5s.company_id = public.get_user_company_id()
    )
  );

-----------------------------------------------------------------------
-- 6. PERFORMANCE INDEXES
-----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_5s_company_id ON public.audit_5s(company_id);

COMMIT;
