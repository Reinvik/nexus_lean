-- FIX QUIRÚRGICO: Eliminar SOLO las 2 políticas que causan recursión infinita
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar la política SELECT que tiene subquery recursivo
DROP POLICY IF EXISTS "profiles_select_super" ON public.profiles;

-- 2. Eliminar la política UPDATE que tiene subquery recursivo  
DROP POLICY IF EXISTS "profiles_update_company_admin" ON public.profiles;

-- 3. También hay una política redundante que podría causar conflictos:
DROP POLICY IF EXISTS "Users can view profiles from their company" ON public.profiles;

-- ¡LISTO! Las demás políticas son seguras porque solo usan auth.uid() directamente.
-- Después de ejecutar esto, el login debería funcionar inmediatamente.
