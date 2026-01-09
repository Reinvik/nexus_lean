-- UNIFIED RLS PATTERN (Profile-Based)
-- Replaces all previous mixed policies (JWT vs Profile) with a single, robust Profile-lookup strategy.
-- Fixes 403/400 errors for A3, VSM, and 5S Audits.

BEGIN;

-----------------------------------------------------------------------
-- 1. A3 PROJECTS
-----------------------------------------------------------------------
ALTER TABLE public.a3_projects ENABLE ROW LEVEL SECURITY;

-- Clean up old/conflicting policies
DROP POLICY IF EXISTS "A3 view_policy" ON public.a3_projects;
DROP POLICY IF EXISTS "A3 insert_policy" ON public.a3_projects;
DROP POLICY IF EXISTS "A3 update_policy" ON public.a3_projects;
DROP POLICY IF EXISTS "A3 delete_policy" ON public.a3_projects;
DROP POLICY IF EXISTS "Users can view A3s from their company" ON public.a3_projects;
DROP POLICY IF EXISTS "Users can insert A3s for their company" ON public.a3_projects;
DROP POLICY IF EXISTS "Users can update A3s from their company" ON public.a3_projects;
DROP POLICY IF EXISTS "Users can delete A3s from their company" ON public.a3_projects;
DROP POLICY IF EXISTS "View A3 Projects" ON public.a3_projects;
DROP POLICY IF EXISTS "Insert A3 Projects" ON public.a3_projects;
DROP POLICY IF EXISTS "Update A3 Projects" ON public.a3_projects;
DROP POLICY IF EXISTS "Delete A3 Projects" ON public.a3_projects;

-- New Consistent Policies
CREATE POLICY "a3_select_company_or_superadmin"
  ON public.a3_projects FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = a3_projects.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
  ));

CREATE POLICY "a3_insert_company_or_superadmin"
  ON public.a3_projects FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = a3_projects.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
  ));

CREATE POLICY "a3_update_company_or_superadmin"
  ON public.a3_projects FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = a3_projects.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
  ));

CREATE POLICY "a3_delete_company_or_superadmin"
  ON public.a3_projects FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = a3_projects.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
  ));

-----------------------------------------------------------------------
-- 2. VSM PROJECTS
-----------------------------------------------------------------------
ALTER TABLE public.vsm_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "VSM view_policy" ON public.vsm_projects;
DROP POLICY IF EXISTS "VSM insert_policy" ON public.vsm_projects;
DROP POLICY IF EXISTS "VSM update_policy" ON public.vsm_projects;
DROP POLICY IF EXISTS "VSM delete_policy" ON public.vsm_projects;
DROP POLICY IF EXISTS "Users can view VSM projects from their company" ON public.vsm_projects;
DROP POLICY IF EXISTS "Users can insert VSM projects for their company" ON public.vsm_projects;
DROP POLICY IF EXISTS "Users can update VSM projects from their company" ON public.vsm_projects;
DROP POLICY IF EXISTS "Users can delete VSM projects from their company" ON public.vsm_projects;
DROP POLICY IF EXISTS "View VSM Projects" ON public.vsm_projects;
DROP POLICY IF EXISTS "Insert VSM Projects" ON public.vsm_projects;
DROP POLICY IF EXISTS "Update VSM Projects" ON public.vsm_projects;
DROP POLICY IF EXISTS "Delete VSM Projects" ON public.vsm_projects;

CREATE POLICY "vsm_select_company_or_superadmin"
  ON public.vsm_projects FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = vsm_projects.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
  ));

CREATE POLICY "vsm_insert_company_or_superadmin"
  ON public.vsm_projects FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = vsm_projects.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
  ));

CREATE POLICY "vsm_update_company_or_superadmin"
  ON public.vsm_projects FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = vsm_projects.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
  ));

CREATE POLICY "vsm_delete_company_or_superadmin"
  ON public.vsm_projects FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = vsm_projects.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
  ));

-----------------------------------------------------------------------
-- 3. AUDIT 5S & ENTRIES
-----------------------------------------------------------------------
ALTER TABLE public.audit_5s ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_5s_entries ENABLE ROW LEVEL SECURITY;

-- Audit Header Policies
DROP POLICY IF EXISTS "Users can view audits from their company" ON public.audit_5s;
DROP POLICY IF EXISTS "Users can insert audits for their company" ON public.audit_5s;
DROP POLICY IF EXISTS "Users can update audits from their company" ON public.audit_5s;
DROP POLICY IF EXISTS "Users can delete audits from their company" ON public.audit_5s;
DROP POLICY IF EXISTS "Authenticated users can manage audits" ON public.audit_5s;
DROP POLICY IF EXISTS "View Audit 5S" ON public.audit_5s;
DROP POLICY IF EXISTS "Insert Audit 5S" ON public.audit_5s;
DROP POLICY IF EXISTS "Update Audit 5S" ON public.audit_5s;
DROP POLICY IF EXISTS "Delete Audit 5S" ON public.audit_5s;
-- Legacy names from user input
DROP POLICY IF EXISTS "Audit view_policy" ON public.audit_5s;
DROP POLICY IF EXISTS "Audit insert_policy" ON public.audit_5s;
DROP POLICY IF EXISTS "Audit update_policy" ON public.audit_5s;
DROP POLICY IF EXISTS "Audit delete_policy" ON public.audit_5s;

CREATE POLICY "audit5s_select_company_or_superadmin"
  ON public.audit_5s FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = audit_5s.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
  ));

CREATE POLICY "audit5s_insert_company_or_superadmin"
  ON public.audit_5s FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = audit_5s.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
  ));

CREATE POLICY "audit5s_update_company_or_superadmin"
  ON public.audit_5s FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = audit_5s.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
  ));

CREATE POLICY "audit5s_delete_company_or_superadmin"
  ON public.audit_5s FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.company_id = audit_5s.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
  ));

-- Audit Entries Policies
DROP POLICY IF EXISTS "Users can manage entries from their company" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "Authenticated users can manage audit entries" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "Manage Audit Entries" ON public.audit_5s_entries;
-- Legacy names
DROP POLICY IF EXISTS "AuditEntry view_policy" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "AuditEntry insert_policy" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "AuditEntry update_policy" ON public.audit_5s_entries;
DROP POLICY IF EXISTS "AuditEntry delete_policy" ON public.audit_5s_entries;

CREATE POLICY "audit5s_entries_select_via_header"
  ON public.audit_5s_entries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.audit_5s a
    WHERE a.id = audit_5s_entries.audit_id
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.company_id = a.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
      )
  ));

CREATE POLICY "audit5s_entries_insert_via_header"
  ON public.audit_5s_entries FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.audit_5s a
    WHERE a.id = audit_5s_entries.audit_id
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.company_id = a.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
      )
  ));

CREATE POLICY "audit5s_entries_update_via_header"
  ON public.audit_5s_entries FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.audit_5s a
    WHERE a.id = audit_5s_entries.audit_id
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.company_id = a.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
      )
  ));

CREATE POLICY "audit5s_entries_delete_via_header"
  ON public.audit_5s_entries FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.audit_5s a
    WHERE a.id = audit_5s_entries.audit_id
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (p.company_id = a.company_id OR p.role = 'superadmin' OR p.role = 'platform_admin')
      )
  ));

-----------------------------------------------------------------------
-- 4. INDEXES
-----------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_a3_company ON public.a3_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_vsm_company ON public.vsm_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_audit5s_company ON public.audit_5s(company_id);
CREATE INDEX IF NOT EXISTS idx_audit5s_entries_audit ON public.audit_5s_entries(audit_id);

COMMIT;
