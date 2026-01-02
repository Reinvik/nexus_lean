-- Migration: Fix Recursion via Metadata
-- Description: Moves permission check source from public.profiles (RLS protected) 
-- to auth.users (Safe for Security Definer), breaking the infinite recursion loop.

BEGIN;

-- 1. Sync existing profiles roles to auth.users metadata
-- This ensures 'is_admin' will work immediately after migration
UPDATE auth.users u
SET raw_user_meta_data = 
  COALESCE(u.raw_user_meta_data, '{}'::jsonb) || 
  jsonb_build_object('role', p.role)
FROM public.profiles p
WHERE u.id = p.id;

-- 2. Redefine is_admin() to read from auth.users (Breaking the loop)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  _role text;
BEGIN
  -- A. Fast Path: Check JWT email (Hardcoded Superadmins)
  -- This handles the specific users requested regardless of DB state
  IF (auth.jwt() ->> 'email') IN ('ariel.mellag@gmail.com', 'Equipo@belean.cl') THEN
    RETURN TRUE;
  END IF;

  -- B. Check Metadata in auth.users
  -- Since this function is SECURITY DEFINER, it can read auth.users
  -- auth.users does NOT have RLS that points back to profiles, so no loop.
  SELECT raw_user_meta_data->>'role'
  INTO _role
  FROM auth.users
  WHERE id = auth.uid();

  RETURN (_role = 'superadmin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger to keep metadata in sync
-- Whenever a profile role is updated (e.g. promoting a user), update auth.users
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;
CREATE TRIGGER on_profile_role_change
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.sync_profile_role();

-- 4. Ensure Trigger also runs on Insert
DROP TRIGGER IF EXISTS on_profile_role_insert ON public.profiles;
CREATE TRIGGER on_profile_role_insert
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.sync_profile_role();

COMMIT;
