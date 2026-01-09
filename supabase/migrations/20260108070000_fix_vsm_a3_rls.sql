-- Fix RLS for A3 Projects and VSM Projects
-- Standardizing policies to match the working Profiles / 5S pattern using get_user_company_id()

BEGIN;

-----------------------------------------------------------------------
-- 1. A3 PROJECTS RLS FIX
-----------------------------------------------------------------------
ALTER TABLE public.a3_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "A3 Projects visible for company" ON public.a3_projects;
DROP POLICY IF EXISTS "A3 Projects editable by company" ON public.a3_projects;
DROP POLICY IF EXISTS "Users can view A3s from their company" ON public.a3_projects;
DROP POLICY IF EXISTS "Users can insert A3s for their company" ON public.a3_projects;
DROP POLICY IF EXISTS "Users can update A3s from their company" ON public.a3_projects;
DROP POLICY IF EXISTS "Users can delete A3s from their company" ON public.a3_projects;


-- SELECT: Company match OR Superadmin
CREATE POLICY "Users can view A3s from their company"
ON public.a3_projects FOR SELECT
USING (
  company_id = public.get_user_company_id() 
  OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Users can insert A3s for their company"
ON public.a3_projects FOR INSERT
WITH CHECK (
  company_id = public.get_user_company_id()
  OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Users can update A3s from their company"
ON public.a3_projects FOR UPDATE
USING (
  company_id = public.get_user_company_id()
  OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Users can delete A3s from their company"
ON public.a3_projects FOR DELETE
USING (
  company_id = public.get_user_company_id()
  OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-----------------------------------------------------------------------
-- 2. VSM PROJECTS RLS FIX
-----------------------------------------------------------------------
ALTER TABLE public.vsm_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view VSM projects from their company" ON public.vsm_projects;
DROP POLICY IF EXISTS "Users can insert VSM projects for their company" ON public.vsm_projects;
DROP POLICY IF EXISTS "Users can update VSM projects from their company" ON public.vsm_projects;
DROP POLICY IF EXISTS "Users can delete VSM projects from their company" ON public.vsm_projects;

CREATE POLICY "Users can view VSM projects from their company"
ON public.vsm_projects FOR SELECT
USING (
  company_id = public.get_user_company_id()
  OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Users can insert VSM projects for their company"
ON public.vsm_projects FOR INSERT
WITH CHECK (
  company_id = public.get_user_company_id()
  OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Users can update VSM projects from their company"
ON public.vsm_projects FOR UPDATE
USING (
  company_id = public.get_user_company_id()
  OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

CREATE POLICY "Users can delete VSM projects from their company"
ON public.vsm_projects FOR DELETE
USING (
  company_id = public.get_user_company_id()
  OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin')
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_a3_projects_company_id ON public.a3_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_vsm_projects_company_id ON public.vsm_projects(company_id);

COMMIT;
