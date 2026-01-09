-- FIX MIGRATION: Schema, Permissions, and RLS (Updated to support 'superuser')
-- Run this in Supabase SQL Editor to resolve 400 and 403 errors.

BEGIN;

-----------------------------------------------------------------------
-- 1. FIX SCHEMA (Missing Columns check)
-----------------------------------------------------------------------
-- Ensure audit_date exists in audit_5s
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_5s' AND column_name = 'audit_date') THEN
        ALTER TABLE public.audit_5s ADD COLUMN audit_date date NOT NULL DEFAULT current_date;
    END IF;
    
    -- Ensure total_score exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_5s' AND column_name = 'total_score') THEN
        ALTER TABLE public.audit_5s ADD COLUMN total_score numeric(4,2) DEFAULT 0;
    END IF;
END $$;

-- Update indexes just in case
CREATE INDEX IF NOT EXISTS audit_5s_audit_date_idx ON public.audit_5s(audit_date);

-----------------------------------------------------------------------
-- 2. HELPER FUNCTION (SECURITY DEFINER)
-- Bypasses RLS to safely get user info
-----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

-----------------------------------------------------------------------
-- 3. RESET PERMISSIONS
-----------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-----------------------------------------------------------------------
-- 4. FORCE RE-APPLY RLS (Using Safe Functions & 'superuser' support)
-- A3 PROJECTS
-----------------------------------------------------------------------
ALTER TABLE public.a3_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "a3_unified_policy" ON public.a3_projects;
DROP POLICY IF EXISTS "a3_select_company_or_superadmin" ON public.a3_projects;
DROP POLICY IF EXISTS "a3_insert_company_or_superadmin" ON public.a3_projects;
DROP POLICY IF EXISTS "a3_update_company_or_superadmin" ON public.a3_projects;
DROP POLICY IF EXISTS "a3_delete_company_or_superadmin" ON public.a3_projects;

CREATE POLICY "a3_unified_policy" ON public.a3_projects
FOR ALL TO authenticated
USING (
  company_id = get_current_user_company_id() 
  OR 
  get_current_user_role() IN ('superadmin', 'platform_admin', 'superuser')
)
WITH CHECK (
  company_id = get_current_user_company_id() 
  OR 
  get_current_user_role() IN ('superadmin', 'platform_admin', 'superuser')
);

-----------------------------------------------------------------------
-- VSM PROJECTS
-----------------------------------------------------------------------
ALTER TABLE public.vsm_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vsm_unified_policy" ON public.vsm_projects;
DROP POLICY IF EXISTS "vsm_select_company_or_superadmin" ON public.vsm_projects;
DROP POLICY IF EXISTS "vsm_insert_company_or_superadmin" ON public.vsm_projects;
DROP POLICY IF EXISTS "vsm_update_company_or_superadmin" ON public.vsm_projects;
DROP POLICY IF EXISTS "vsm_delete_company_or_superadmin" ON public.vsm_projects;

CREATE POLICY "vsm_unified_policy" ON public.vsm_projects
FOR ALL TO authenticated
USING (
  company_id = get_current_user_company_id() 
  OR 
  get_current_user_role() IN ('superadmin', 'platform_admin', 'superuser')
)
WITH CHECK (
  company_id = get_current_user_company_id() 
  OR 
  get_current_user_role() IN ('superadmin', 'platform_admin', 'superuser')
);

-----------------------------------------------------------------------
-- AUDIT 5S
-----------------------------------------------------------------------
ALTER TABLE public.audit_5s ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_unified_policy" ON public.audit_5s;
DROP POLICY IF EXISTS "audit5s_select_company_or_superadmin" ON public.audit_5s;
DROP POLICY IF EXISTS "audit5s_insert_company_or_superadmin" ON public.audit_5s;
DROP POLICY IF EXISTS "audit5s_update_company_or_superadmin" ON public.audit_5s;
DROP POLICY IF EXISTS "audit5s_delete_company_or_superadmin" ON public.audit_5s;

CREATE POLICY "audit_unified_policy" ON public.audit_5s
FOR ALL TO authenticated
USING (
  company_id = get_current_user_company_id() 
  OR 
  get_current_user_role() IN ('superadmin', 'platform_admin', 'superuser')
)
WITH CHECK (
  company_id = get_current_user_company_id() 
  OR 
  get_current_user_role() IN ('superadmin', 'platform_admin', 'superuser')
);

-- AUDIT ENTRIES (Link to Headers with simple check)
ALTER TABLE public.audit_5s_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_entries_unified_policy" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "audit5s_entries_select_via_header" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "audit5s_entries_insert_via_header" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "audit5s_entries_update_via_header" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "audit5s_entries_delete_via_header" ON public.audit_5s_entries;

CREATE POLICY "audit_entries_unified_policy" ON public.audit_5s_entries
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.audit_5s a
    WHERE a.id = audit_5s_entries.audit_id
    AND (
      a.company_id = get_current_user_company_id() 
      OR 
      get_current_user_role() IN ('superadmin', 'platform_admin', 'superuser')
    )
  )
);

COMMIT;
