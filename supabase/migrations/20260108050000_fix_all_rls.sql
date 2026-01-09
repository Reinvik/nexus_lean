-- Comprehensive RLS Fix for Profiles and Audits
-- Combines fixes for profiles recursion and audit table permissions

BEGIN;

-----------------------------------------------------------------------
-- 1. Fix Profiles RLS (Security Base)
-----------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop potentially recursive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.profiles;

-- Create simple, direct policies using auth.uid()
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING ( id = auth.uid() );

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK ( id = auth.uid() );

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING ( id = auth.uid() );

-----------------------------------------------------------------------
-- 2. Fix Audit 5S RLS
-----------------------------------------------------------------------
-- Drop existing audit policies
DROP POLICY IF EXISTS "Users can view audits from their company" ON audit_5s;
DROP POLICY IF EXISTS "Users can insert audits for their company" ON audit_5s;
DROP POLICY IF EXISTS "Users can update audits from their company" ON audit_5s;
DROP POLICY IF EXISTS "Users can delete audits from their company" ON audit_5s;

DROP POLICY IF EXISTS "Users can view entries from their company's audits" ON audit_5s_entries;
DROP POLICY IF EXISTS "Users can insert entries for their company's audits" ON audit_5s_entries;
DROP POLICY IF EXISTS "Users can update entries from their company's audits" ON audit_5s_entries;
DROP POLICY IF EXISTS "Users can delete entries from their company's audits" ON audit_5s_entries;

-- Re-create Audit Policies (using non-recursive logic)
-- We check against the profile's company_id. 
-- Now that profiles RLS is fixed, this subquery is safe.

CREATE POLICY "Users can view audits from their company"
  ON audit_5s FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert audits for their company"
  ON audit_5s FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update audits from their company"
  ON audit_5s FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete audits from their company"
  ON audit_5s FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Audit Entries Policies (Parent-Child relationship)
CREATE POLICY "Users can view entries from their company"
  ON audit_5s_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM audit_5s 
      WHERE audit_5s.id = audit_5s_entries.audit_id
      AND audit_5s.company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert entries for their company"
  ON audit_5s_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM audit_5s 
      WHERE audit_5s.id = audit_5s_entries.audit_id
      AND audit_5s.company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );
  
CREATE POLICY "Users can update entries for their company"
  ON audit_5s_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM audit_5s 
      WHERE audit_5s.id = audit_5s_entries.audit_id
      AND audit_5s.company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete entries for their company"
  ON audit_5s_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM audit_5s 
      WHERE audit_5s.id = audit_5s_entries.audit_id
      AND audit_5s.company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

COMMIT;
