-- AUTH HOOK: Inyectar role y company_id en el JWT
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- PASO 1: Crear la función del hook
-- ============================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_role text;
  user_company_id uuid;
BEGIN
  -- Obtener el role y company_id del usuario desde profiles
  SELECT role, company_id INTO user_role, user_company_id
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  -- Construir los claims personalizados
  claims := event->'claims';

  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{role}', '"user"');
  END IF;

  IF user_company_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{company_id}', to_jsonb(user_company_id::text));
  END IF;

  -- Retornar el evento con los claims actualizados
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- ============================================
-- PASO 2: Dar permisos al servicio de auth
-- ============================================
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
GRANT SELECT ON public.profiles TO supabase_auth_admin;

-- Revocar acceso público a la función por seguridad
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;

-- ============================================
-- PASO 3: MANUAL - Activar el hook en Supabase Dashboard
-- ============================================
-- 1. Ve a: Authentication > Hooks
-- 2. Activa "Customize Access Token (JWT) Claims"
-- 3. Selecciona: public.custom_access_token_hook
-- 4. Guarda

-- ============================================
-- VERIFICACIÓN (después de activar el hook)
-- ============================================
-- Cierra sesión y vuelve a iniciar.
-- En la consola del navegador:
--   const { data } = await supabase.auth.getSession()
--   // Decodifica data.session.access_token en jwt.io
--   // Deberías ver: { "role": "superadmin", "company_id": "uuid..." }
