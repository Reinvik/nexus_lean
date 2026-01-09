-- Migration: 20260108130000_admin_helpers.sql

-- 1. Helper Function: Assign User Role and Company (Option A: by company_id)
-- Securely allows superadmin/platform_admin to assign users to companies/roles.

create or replace function public.assign_user_role_company(
  p_email text,
  p_company_id uuid,
  p_role text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_requester_role text;
begin
  -- Check requester permissions
  select role into v_requester_role
  from public.profiles
  where id = auth.uid();

  if v_requester_role not in ('superadmin','platform_admin') then
    raise exception 'not authorized' using hint = 'Only superadmin/platform_admin can assign roles';
  end if;

  -- Validate company existence
  if not exists (select 1 from public.companies c where c.id = p_company_id) then
    raise exception 'company not found';
  end if;

  -- Find profile by email (linking via auth.users)
  select p.id
  into v_profile_id
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(p_email);

  if v_profile_id is null then
    raise exception 'user not found' using hint = 'Create the user first in Auth > Users';
  end if;

  -- Update profile
  update public.profiles
  set role = p_role,
      company_id = p_company_id
  where id = v_profile_id;
end;
$$;

revoke all on function public.assign_user_role_company(text, uuid, text) from public;
grant execute on function public.assign_user_role_company(text, uuid, text) to authenticated;


-- 2. RLS Policies for Profiles
-- Ensure robust access control based on the new roles.

alter table public.profiles enable row level security;

-- Drop existing policies to avoid conflicts (and ensure we are applying the latest logic)
drop policy if exists profiles_select_super on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_company_admin on public.profiles;
drop policy if exists profiles_update_roles_only_admin on public.profiles;
-- Also drop potentially conflicting old policies if naming was different in previous migrations
-- (Good practice to clean up, though specific names are best)


-- Policy: Select - Superadmins see all, Company Admins see their company, Users see themselves.
create policy profiles_select_super on public.profiles
for select to authenticated
using (
  (select role from public.profiles where id = auth.uid()) in ('superadmin','platform_admin')
  or company_id = (select company_id from public.profiles where id = auth.uid())
  or id = auth.uid()
);

-- Policy: Update - Users can update their own profile (e.g. name, avatar - limited cols usually better but this is broad for now)
create policy profiles_update_self on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Policy: Update - Company Admins can update profiles in their company
-- Note: Limit this if you don't want them changing roles. The helper function is safer for roles.
create policy profiles_update_company_admin on public.profiles
for update to authenticated
using (
  (select role from public.profiles where id = auth.uid()) in ('superadmin','platform_admin','company_admin')
  and company_id = (select company_id from public.profiles where id = auth.uid())
)
with check (
  company_id = (select company_id from public.profiles where id = auth.uid())
);
