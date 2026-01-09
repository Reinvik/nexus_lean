-- RESTAURAR ACCESO POR COMPAÑÍA + ADMINS (sin recursión)
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- PASO 1: Eliminar las políticas "own-only" actuales
-- ============================================
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- ============================================
-- PASO 2: Crear políticas con acceso por compañía
-- ============================================

-- SELECT: Ver mi perfil + perfiles de mi compañía + superadmins ven todo
CREATE POLICY "profiles_select"
ON public.profiles FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR company_id = (auth.jwt() ->> 'company_id')::uuid
  OR (auth.jwt() ->> 'role') = ANY (ARRAY['superadmin', 'platform_admin'])
);

-- INSERT: Solo puedo crear mi propio perfil
CREATE POLICY "profiles_insert"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- UPDATE: Puedo editar mi perfil. Admins pueden editar perfiles de su compañía.
CREATE POLICY "profiles_update"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR (
    company_id = (auth.jwt() ->> 'company_id')::uuid
    AND (auth.jwt() ->> 'role') = ANY (ARRAY['superadmin', 'platform_admin', 'company_admin'])
  )
)
WITH CHECK (
  id = auth.uid()
  OR (
    company_id = (auth.jwt() ->> 'company_id')::uuid
    AND (auth.jwt() ->> 'role') = ANY (ARRAY['superadmin', 'platform_admin', 'company_admin'])
  )
);

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- Estas políticas requieren que el JWT tenga los claims:
--   - role: 'user' | 'superadmin' | 'platform_admin' | etc.
--   - company_id: UUID de la compañía del usuario
--
-- Si el JWT NO tiene estos claims, el acceso será solo "self".
-- Para agregar claims al JWT, necesitas un Auth Hook en Supabase.
