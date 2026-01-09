-- SECURITY FIX: Function Search Path Mutable
-- Corrección de vulnerabilidades de seguridad en funciones SECURITY DEFINER
-- Se añade "SET search_path = public" para evitar la inyección de objetos maliciosos.

-- 1. CORREGIR FUNCION public.is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp -- FIX: Search Path explícito
AS $$
BEGIN
  -- Permite verificar si es admin sin activar políticas RLS recursivas
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

-- 2. CORREGIR FUNCION public.handle_new_user()
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp -- FIX: Search Path explícito
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name',
    CASE WHEN new.email = 'ariel.mellag@gmail.com' THEN 'admin' ELSE 'user' END
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = excluded.email, name = excluded.name; 
  RETURN new;
END;
$$;
