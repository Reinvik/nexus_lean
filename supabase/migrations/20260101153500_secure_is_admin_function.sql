-- CRITICAL SECURITY FIX
-- The previous definition of public.is_admin() included 'admin' role, which caused standard Company Admins
-- to bypass RLS policies and see ALL data from ALL companies.
-- This script restricts public.is_admin() to ONLY return true for 'superadmin' role or specific developers.
-- Standard 'admin' users will now fall through to the specific company-match policies.

create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() 
    and (
        role = 'superadmin' 
        OR 
        -- Hardcoded Superadmins (Safety Net)
        email IN ('ariel.mellag@gmail.com', 'equipo@belean.cl')
    )
  );
end;
$$ language plpgsql security definer;
