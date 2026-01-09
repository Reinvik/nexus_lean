-- CONSOLIDACIÓN: Eliminar políticas duplicadas y dejar solo 3 limpias
-- Ejecutar en Supabase SQL Editor

BEGIN;

-- ============================================
-- PASO 1: Eliminar TODAS las políticas actuales de profiles
-- ============================================

-- SELECT duplicates
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_view_own" ON public.profiles;

-- INSERT duplicates
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;

-- UPDATE duplicates
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self_safe" ON public.profiles;

-- Otras políticas potencialmente problemáticas
DROP POLICY IF EXISTS "Superadmins can do everything" ON public.profiles;
DROP POLICY IF EXISTS "Superusers can view company members" ON public.profiles;

-- ============================================
-- PASO 2: Crear 3 políticas simples y limpias
-- ============================================

-- SELECT: Usuario puede ver su propio perfil
CREATE POLICY "profiles_select_own"
ON public.profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- INSERT: Usuario puede crear su propio perfil
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- UPDATE: Usuario puede actualizar su propio perfil
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

COMMIT;

-- Resultado: Solo 3 políticas limpias, sin recursión, sin duplicados.
