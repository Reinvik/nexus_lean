-- COMPREHENSIVE RLS FIX
-- Goal: Standardize RLS across ALL modules (5S, A3, VSM) and ensure Superadmins can manage ANY company's data.
-- This supersedes previous partial fixes.

BEGIN;

-- 1. HELPER FUNCTIONS
-----------------------------------------------------------------------
-- Get current user's company_id (Optimized, Security Definer)
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Check if user is Superadmin (or Platform Admin)
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    RETURN v_role IN ('superadmin', 'platform_admin');
END;
$$;

-----------------------------------------------------------------------
-- 2. AUDIT 5S POLICIES (Fixing logic from reset_rls_policies)
-----------------------------------------------------------------------
ALTER TABLE public.audit_5s ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view audits from their company" ON public.audit_5s;
DROP POLICY IF EXISTS "Users can insert audits for their company" ON public.audit_5s;
DROP POLICY IF EXISTS "Users can update audits from their company" ON public.audit_5s;
DROP POLICY IF EXISTS "Users can delete audits from their company" ON public.audit_5s;
DROP POLICY IF EXISTS "Authenticated users can manage audits" ON public.audit_5s; 

CREATE POLICY "View Audit 5S" ON public.audit_5s FOR SELECT
USING ( company_id = public.get_user_company_id() OR public.is_superadmin() );

CREATE POLICY "Insert Audit 5S" ON public.audit_5s FOR INSERT
WITH CHECK ( company_id = public.get_user_company_id() OR public.is_superadmin() );

CREATE POLICY "Update Audit 5S" ON public.audit_5s FOR UPDATE
USING ( company_id = public.get_user_company_id() OR public.is_superadmin() );

CREATE POLICY "Delete Audit 5S" ON public.audit_5s FOR DELETE
USING ( company_id = public.get_user_company_id() OR public.is_superadmin() );

-- Entries (Cascade access from Audit)
ALTER TABLE public.audit_5s_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage entries from their company" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "Authenticated users can manage audit entries" ON public.audit_5s_entries;

CREATE POLICY "Manage Audit Entries" ON public.audit_5s_entries FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.audit_5s 
    WHERE audit_5s.id = audit_5s_entries.audit_id
    AND (audit_5s.company_id = public.get_user_company_id() OR public.is_superadmin())
  )
);

-----------------------------------------------------------------------
-- 3. A3 PROJECTS POLICIES
-----------------------------------------------------------------------
ALTER TABLE public.a3_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view A3s from their company" ON public.a3_projects;
DROP POLICY IF EXISTS "Users can insert A3s for their company" ON public.a3_projects;
DROP POLICY IF EXISTS "Users can update A3s from their company" ON public.a3_projects;
DROP POLICY IF EXISTS "Users can delete A3s from their company" ON public.a3_projects;

CREATE POLICY "View A3 Projects" ON public.a3_projects FOR SELECT
USING ( company_id = public.get_user_company_id() OR public.is_superadmin() );

CREATE POLICY "Insert A3 Projects" ON public.a3_projects FOR INSERT
WITH CHECK ( company_id = public.get_user_company_id() OR public.is_superadmin() );

CREATE POLICY "Update A3 Projects" ON public.a3_projects FOR UPDATE
USING ( company_id = public.get_user_company_id() OR public.is_superadmin() );

CREATE POLICY "Delete A3 Projects" ON public.a3_projects FOR DELETE
USING ( company_id = public.get_user_company_id() OR public.is_superadmin() );

-----------------------------------------------------------------------
-- 4. VSM PROJECTS POLICIES
-----------------------------------------------------------------------
ALTER TABLE public.vsm_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view VSM projects from their company" ON public.vsm_projects;
DROP POLICY IF EXISTS "Users can insert VSM projects for their company" ON public.vsm_projects;
DROP POLICY IF EXISTS "Users can update VSM projects from their company" ON public.vsm_projects;
DROP POLICY IF EXISTS "Users can delete VSM projects from their company" ON public.vsm_projects;


CREATE POLICY "View VSM Projects" ON public.vsm_projects FOR SELECT
USING ( company_id = public.get_user_company_id() OR public.is_superadmin() );

CREATE POLICY "Insert VSM Projects" ON public.vsm_projects FOR INSERT
WITH CHECK ( company_id = public.get_user_company_id() OR public.is_superadmin() );

CREATE POLICY "Update VSM Projects" ON public.vsm_projects FOR UPDATE
USING ( company_id = public.get_user_company_id() OR public.is_superadmin() );

CREATE POLICY "Delete VSM Projects" ON public.vsm_projects FOR DELETE
USING ( company_id = public.get_user_company_id() OR public.is_superadmin() );

COMMIT;
