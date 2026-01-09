-- ==========================================
-- 1. FUNCTIONS & TRIGGERS (Auto-Profile)
-- ==========================================

create or replace function public.ensure_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  _role text;
  _company_id uuid;
begin
  -- Safely extract metadata
  _role := nullif(new.raw_user_meta_data->>'role','');
  
  -- Try to cast company_id, handling potential errors if invalid format
  begin
    _company_id := nullif(new.raw_user_meta_data->>'company_id','')::uuid;
  exception when others then
    _company_id := null;
  end;

  insert into public.profiles (id, role, company_id)
  values (
    new.id,
    coalesce(_role, 'user'),
    _company_id
  )
  on conflict (id) do update
    set role = coalesce(excluded.role, public.profiles.role),
        company_id = coalesce(excluded.company_id, public.profiles.company_id);

  return new;
exception when others then
  -- Fail-safe: Do not block signup if profile creation fails
  -- Log error if possible or just continue
  return new;
end;
$$;

revoke all on function public.ensure_profile_for_user() from public, anon, authenticated;

-- Triggers
drop trigger if exists ensure_profile_after_signup on auth.users;
create trigger ensure_profile_after_signup
after insert on auth.users
for each row execute function public.ensure_profile_for_user();

drop trigger if exists ensure_profile_after_update on auth.users;
create trigger ensure_profile_after_update
after update of raw_user_meta_data on auth.users
for each row execute function public.ensure_profile_for_user();

-- ==========================================
-- 2. PROFILE RLS POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING ( id = (select auth.uid()) );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK ( id = (select auth.uid()) );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING ( id = (select auth.uid()) )
WITH CHECK ( id = (select auth.uid()) );

-- ==========================================
-- 3. COMPANY RLS POLICIES
-- ==========================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Regular users see their assigned company
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
CREATE POLICY "Users can view own company"
ON public.companies FOR SELECT TO authenticated
USING (
  id IN (
    SELECT company_id FROM public.profiles
    WHERE id = (select auth.uid())
  )
);

-- Superusers see ALL companies (Optional but recommended for Admin)
DROP POLICY IF EXISTS "Superusers can view all companies" ON public.companies;
CREATE POLICY "Superusers can view all companies"
ON public.companies FOR SELECT TO authenticated
USING (
  exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('superuser','superadmin')
  )
);

-- ==========================================
-- 4. INDICES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_id ON public.companies(id);

-- ==========================================
-- 5. BACKFILL & AUDIT
-- ==========================================

-- Backfill missing
insert into public.profiles (id, role)
select u.id, 'user'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Audit Columns
alter table public.profiles 
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- Audit Trigger
create or replace function public.set_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_profiles_updated_at();
