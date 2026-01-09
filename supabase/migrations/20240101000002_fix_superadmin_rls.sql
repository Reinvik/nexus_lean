-- Migration: Fix Superadmin RLS Policies
-- Description: Unlocks full access for Superadmins across all companies (even when company_id is NULL or set to a specific one)

BEGIN;

-- 1. Function to check for superadmin role effectively
-- (Optional helper, but we'll stick to direct checks for clarity)

--------------------------------------------------------------
-- 5S CARDS (five_s_cards)
--------------------------------------------------------------
DROP POLICY IF EXISTS "Superadmin select all cards" ON public.five_s_cards;
DROP POLICY IF EXISTS "Superadmin insert all cards" ON public.five_s_cards;
DROP POLICY IF EXISTS "Superadmin update all cards" ON public.five_s_cards;
DROP POLICY IF EXISTS "Superadmin delete all cards" ON public.five_s_cards;

-- Unified Policy for Superadmin (Select, Insert, Update, Delete)
CREATE POLICY "Superadmin manage all cards"
ON public.five_s_cards
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' OR
  (auth.jwt() ->> 'email') IN ('ariel.mellag@gmail.com', 'equipo@belean.cl')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' OR
  (auth.jwt() ->> 'email') IN ('ariel.mellag@gmail.com', 'equipo@belean.cl')
);


--------------------------------------------------------------
-- A3 PROJECTS (a3_projects)
--------------------------------------------------------------
DROP POLICY IF EXISTS "Superadmin manage all a3" ON public.a3_projects;

CREATE POLICY "Superadmin manage all a3"
ON public.a3_projects
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' OR
  (auth.jwt() ->> 'email') IN ('ariel.mellag@gmail.com', 'equipo@belean.cl')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' OR
  (auth.jwt() ->> 'email') IN ('ariel.mellag@gmail.com', 'equipo@belean.cl')
);

--------------------------------------------------------------
-- QUICK WINS (quick_wins)
--------------------------------------------------------------
DROP POLICY IF EXISTS "Superadmin manage all quick_wins" ON public.quick_wins;

CREATE POLICY "Superadmin manage all quick_wins"
ON public.quick_wins
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' OR
  (auth.jwt() ->> 'email') IN ('ariel.mellag@gmail.com', 'equipo@belean.cl')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' OR
  (auth.jwt() ->> 'email') IN ('ariel.mellag@gmail.com', 'equipo@belean.cl')
);

--------------------------------------------------------------
-- VSM PROJECTS (vsm_projects)
--------------------------------------------------------------
DROP POLICY IF EXISTS "Superadmin manage all vsm" ON public.vsm_projects;

CREATE POLICY "Superadmin manage all vsm"
ON public.vsm_projects
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' OR
  (auth.jwt() ->> 'email') IN ('ariel.mellag@gmail.com', 'equipo@belean.cl')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' OR
  (auth.jwt() ->> 'email') IN ('ariel.mellag@gmail.com', 'equipo@belean.cl')
);

--------------------------------------------------------------
-- COMPANIES (companies) - Ensure Management
--------------------------------------------------------------
DROP POLICY IF EXISTS "Superadmin manage companies" ON public.companies;
-- Re-create to be sure
CREATE POLICY "Superadmin manage companies"
ON public.companies
FOR ALL
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' OR
  (auth.jwt() ->> 'email') IN ('ariel.mellag@gmail.com', 'equipo@belean.cl')
)
WITH CHECK (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'superadmin' OR
  (auth.jwt() ->> 'email') IN ('ariel.mellag@gmail.com', 'equipo@belean.cl')
);

COMMIT;
