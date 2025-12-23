-- OPTIMIZACION DE POLÍTICAS RLS (Performance Fix)
-- Este script reemplaza las políticas que evalúan auth.uid() por fila con versiones optimizadas.
-- Referencia: https://supabase.com/docs/guides/database/postgres/row-level-security#performance

-- ==============================================================================
-- 1. TABLA PUBLIC.PROFILES
-- ==============================================================================

-- SELECT
DROP POLICY IF EXISTS "Ver perfiles" ON public.profiles;
CREATE POLICY "Ver perfiles"
  ON public.profiles FOR SELECT USING (
    id = (SELECT auth.uid())
    OR
    public.is_admin()
  );

-- UPDATE
DROP POLICY IF EXISTS "Actualizar perfiles" ON public.profiles;
CREATE POLICY "Actualizar perfiles"
  ON public.profiles FOR UPDATE USING (
    id = (SELECT auth.uid())
    OR
    public.is_admin()
  );

-- INSERT
DROP POLICY IF EXISTS "Insertar perfiles" ON public.profiles;
CREATE POLICY "Insertar perfiles"
  ON public.profiles FOR INSERT WITH CHECK (
    id = (SELECT auth.uid())
  );


-- ==============================================================================
-- 2. TABLA PUBLIC.AUDIT_5S
-- ==============================================================================

-- SELECT
DROP POLICY IF EXISTS "Users can view audit_5s of their company" ON public.audit_5s;
CREATE POLICY "Users can view audit_5s of their company" ON public.audit_5s
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.company_id = audit_5s.company_id
    )
    OR public.is_admin()
  );

-- INSERT
DROP POLICY IF EXISTS "Users can insert audit_5s for their company" ON public.audit_5s;
CREATE POLICY "Users can insert audit_5s for their company" ON public.audit_5s
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.company_id = audit_5s.company_id
    )
    OR public.is_admin()
  );
  
-- UPDATE
DROP POLICY IF EXISTS "Users can update audit_5s for their company" ON public.audit_5s;
CREATE POLICY "Users can update audit_5s for their company" ON public.audit_5s
  FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
        AND profiles.company_id = audit_5s.company_id
    )
    OR public.is_admin()
  );
  
-- DELETE
DROP POLICY IF EXISTS "Users can delete audit_5s for their company" ON public.audit_5s;
CREATE POLICY "Users can delete audit_5s for their company" ON public.audit_5s
  FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = (SELECT auth.uid())
        AND profiles.company_id = audit_5s.company_id
    )
    OR public.is_admin()
  );


-- ==============================================================================
-- 3. TABLA PUBLIC.AUDIT_5S_ENTRIES
-- ==============================================================================

-- SELECT
DROP POLICY IF EXISTS "Users can view entries of their company audits" ON public.audit_5s_entries;
CREATE POLICY "Users can view entries of their company audits" ON public.audit_5s_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.audit_5s
      JOIN public.profiles ON profiles.company_id = audit_5s.company_id
      WHERE audit_5s.id = audit_5s_entries.audit_id
      AND profiles.id = (SELECT auth.uid())
    )
    OR public.is_admin()
  );

-- INSERT
DROP POLICY IF EXISTS "Users can insert entries for their company audits" ON public.audit_5s_entries;
CREATE POLICY "Users can insert entries for their company audits" ON public.audit_5s_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audit_5s
      JOIN public.profiles ON profiles.company_id = audit_5s.company_id
      WHERE audit_5s.id = audit_5s_entries.audit_id
      AND profiles.id = (SELECT auth.uid())
    )
    OR public.is_admin()
  );

-- UPDATE
DROP POLICY IF EXISTS "Users can update entries for their company audits" ON public.audit_5s_entries;
CREATE POLICY "Users can update entries for their company audits" ON public.audit_5s_entries
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.audit_5s
            JOIN public.profiles ON profiles.company_id = audit_5s.company_id
            WHERE audit_5s.id = audit_5s_entries.audit_id
            AND profiles.id = (SELECT auth.uid())
        )
        OR public.is_admin()
    );

-- DELETE
DROP POLICY IF EXISTS "Users can delete entries for their company audits" ON public.audit_5s_entries;
CREATE POLICY "Users can delete entries for their company audits" ON public.audit_5s_entries
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.audit_5s
            JOIN public.profiles ON profiles.company_id = audit_5s.company_id
            WHERE audit_5s.id = audit_5s_entries.audit_id
            AND profiles.id = (SELECT auth.uid())
        )
        OR public.is_admin()
    );
