-- ===========================================
-- NEXUS LEAN - SUPABASE DATABASE SCHEMA
-- Esquema completo para reconstruir la base de datos
-- ===========================================

-- ===== 1) EXTENSIONES BÁSICAS =====
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "http";

-- ===== 2) ESQUEMA DE LA APP =====

-- Empresas
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text, -- Para auto-asignación de usuarios por email
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.companies enable row level security;

-- Perfiles (uno a uno con auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  company_id uuid references public.companies(id),
  avatar_url text,
  role text check (role = any(array['user','superuser','superadmin'])),
  has_ai_access boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;

-- 5S Cards
create table if not exists public.five_s_cards (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  area text not null,
  description text,
  image_url text,
  status text default 'pending' check (status = any(array['Abierto','En Progreso','Cerrado','pending','in_progress','completed'])),
  company_id uuid not null references public.companies(id),
  created_by uuid references auth.users(id),
  priority text check (priority = any(array['Baja','Media','Alta'])),
  category text check (category = any(array['Seiri','Seiton','Seiso','Seiketsu','Shitsuke','Seguridad','Otro'])),
  due_date timestamptz,
  findings text,
  image_urls text[] default '{}',
  assigned_to uuid references public.profiles(id),
  close_date timestamptz,
  after_image_url text,
  closure_comment text
);
alter table public.five_s_cards enable row level security;

-- A3 Projects
create table if not exists public.a3_projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  title text not null,
  status text default 'Nuevo' check (status = any(array['Nuevo','En Proceso','Cerrado'])),
  responsible text,
  date date default current_date,
  background text,
  background_image_url text,
  current_condition text,
  current_condition_image_url text,
  goal text,
  root_cause text,
  pareto_data jsonb default '[]'::jsonb,
  ishikawas jsonb default '[]'::jsonb,
  five_whys jsonb default '[]'::jsonb,
  countermeasures text,
  execution_plan text,
  action_plan jsonb default '[]'::jsonb,
  follow_up_notes text,
  follow_up_data jsonb default '[]'::jsonb,
  created_at timestamptz default timezone('utc', now())
);
alter table public.a3_projects enable row level security;

-- VSM Projects
create table if not exists public.vsm_projects (
  id bigserial primary key,
  name text not null,
  responsible text,
  date date default current_date,
  status text default 'current' check (status = any(array['current','future','completed'])),
  lead_time text,
  process_time text,
  efficiency text,
  image_url text,
  miro_link text,
  description text,
  company_id uuid references public.companies(id),
  takt_time text,
  created_at timestamptz default timezone('utc', now())
);
alter table public.vsm_projects enable row level security;

-- Quick Wins
create table if not exists public.quick_wins (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  title text not null,
  description text,
  proposed_solution text,
  status text default 'idea' check (status = any(array['idea','done'])),
  impact text default 'Medio' check (impact = any(array['Alto','Medio','Bajo'])),
  responsible text,
  date date default current_date,
  deadline date,
  image_url text,
  completion_image_url text,
  completion_comment text,
  completed_at timestamptz,
  likes int default 0,
  created_at timestamptz default timezone('utc', now())
);
alter table public.quick_wins enable row level security;

-- Auditorías 5S (cabecera)
create table if not exists public.audit_5s (
  id bigserial primary key,
  company_id uuid not null references public.companies(id),
  title text not null,
  area text not null,
  auditor text,
  date text,
  total_score numeric default 0,
  status text default 'Completada',
  created_at timestamptz default timezone('utc', now()),
  audit_date date default current_date
);
alter table public.audit_5s enable row level security;

-- Auditorías 5S (entradas)
create table if not exists public.audit_5s_entries (
  id bigserial primary key,
  audit_id bigint references public.audit_5s(id) on delete cascade,
  company_id uuid not null,
  section text not null,
  question text not null,
  score int default 0,
  comment text,
  created_at timestamptz default timezone('utc', now())
);
alter table public.audit_5s_entries enable row level security;

-- ===== 3) AUDIT LOGS =====
create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz not null default timezone('utc', now()),
  user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  user_email text
);
alter table public.audit_logs enable row level security;

-- Políticas mínimas para audit_logs
create policy "audit_logs_insert_auth" on public.audit_logs
for insert to authenticated
with check (true);

create policy "audit_logs_select_auth" on public.audit_logs
for select to authenticated
using (true);

-- Índices útiles
create index if not exists idx_audit_logs_entity_id on public.audit_logs(entity_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

-- ===== 4) FUNCIONES DE SOPORTE =====

-- Helper: retorna company del usuario actual
create or replace function public.current_company_id()
returns uuid
language sql
security definer
set search_path = public, pg_catalog, pg_temp
stable
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

-- is_admin helper
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('superadmin','superuser')
  );
end;
$$;

-- get_current_user_role (para heartbeat)
create or replace function public.get_current_user_role()
returns text
language sql
security definer
set search_path = public, pg_catalog, pg_temp
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Trigger para crear/actualizar perfil al alta en auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    case when lower(new.email) = 'ariel.mellag@gmail.com' then 'superadmin' else 'user' end
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ===== 5) RLS POLICIES =====

-- Companies: permitir a authenticated
create policy "companies_select" on public.companies
for select to authenticated
using (true);

-- Profiles
create policy "profiles_read_self" on public.profiles
for select to authenticated
using ( id = auth.uid() );

create policy "profiles_read_superadmin" on public.profiles
for select to authenticated
using ( public.is_admin() );

create policy "profiles_read_company_admin" on public.profiles
for select to authenticated
using (
  public.get_current_user_role() = 'admin' 
  and company_id = public.current_company_id()
);

create policy "profiles_self_update" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- 5S Cards: misma compañía
create policy "five_s_cards_select" on public.five_s_cards
for select to authenticated
using (company_id = current_company_id());

create policy "five_s_cards_write" on public.five_s_cards
for insert to authenticated
with check (company_id = current_company_id());

create policy "five_s_cards_update" on public.five_s_cards
for update to authenticated
using (company_id = current_company_id())
with check (company_id = current_company_id());

-- A3 Projects
create policy "a3_select" on public.a3_projects
for select to authenticated
using (company_id = current_company_id());

create policy "a3_write" on public.a3_projects
for insert to authenticated
with check (company_id = current_company_id());

create policy "a3_update" on public.a3_projects
for update to authenticated
using (company_id = current_company_id())
with check (company_id = current_company_id());

-- VSM Projects
create policy "vsm_select" on public.vsm_projects
for select to authenticated
using (company_id is null or company_id = current_company_id());

create policy "vsm_write" on public.vsm_projects
for insert to authenticated
with check (company_id = current_company_id());

create policy "vsm_update" on public.vsm_projects
for update to authenticated
using (company_id = current_company_id())
with check (company_id = current_company_id());

-- Quick Wins
create policy "qw_select" on public.quick_wins
for select to authenticated
using (company_id = current_company_id());

create policy "qw_write" on public.quick_wins
for insert to authenticated
with check (company_id = current_company_id());

create policy "qw_update" on public.quick_wins
for update to authenticated
using (company_id = current_company_id())
with check (company_id = current_company_id());

-- Auditorías
create policy "audit5s_select" on public.audit_5s
for select to authenticated
using (company_id = current_company_id());

create policy "audit5s_write" on public.audit_5s
for insert to authenticated
with check (company_id = current_company_id());

create policy "audit5s_update" on public.audit_5s
for update to authenticated
using (company_id = current_company_id())
with check (company_id = current_company_id());

create policy "audit5s_entries_select" on public.audit_5s_entries
for select to authenticated
using (company_id = current_company_id());

create policy "audit5s_entries_write" on public.audit_5s_entries
for insert to authenticated
with check (company_id = current_company_id());

create policy "audit5s_entries_update" on public.audit_5s_entries
for update to authenticated
using (company_id = current_company_id())
with check (company_id = current_company_id());

-- ===== 6) ÍNDICES PARA RLS =====
create index if not exists idx_profiles_company on public.profiles(company_id);
create index if not exists idx_5s_company on public.five_s_cards(company_id);
create index if not exists idx_a3_company on public.a3_projects(company_id);
create index if not exists idx_vsm_company on public.vsm_projects(company_id);
create index if not exists idx_qw_company on public.quick_wins(company_id);
create index if not exists idx_audit5s_company on public.audit_5s(company_id);
create index if not exists idx_audit5s_entries_company on public.audit_5s_entries(company_id);

-- ===== 7) TRIGGER AUDITORÍA 5S CARDS =====
create or replace function public.audit_five_s_cards_trg()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, details, user_email)
    values (auth.uid(), 'CREATE', '5S_CARD', new.id::text, to_jsonb(new), (select email from public.profiles where id = auth.uid()));
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, details, user_email)
    values (auth.uid(), 'UPDATE', '5S_CARD', new.id::text, jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)), (select email from public.profiles where id = auth.uid()));
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, details, user_email)
    values (auth.uid(), 'DELETE', '5S_CARD', old.id::text, to_jsonb(old), (select email from public.profiles where id = auth.uid()));
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_five_s_cards on public.five_s_cards;
create trigger trg_audit_five_s_cards
after insert or update or delete on public.five_s_cards
for each row execute function public.audit_five_s_cards_trg();


-- Trigger para crear logs de Auditorías 5S
create or replace function public.audit_audit_5s_trg()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, details, user_email)
    values (auth.uid(), 'CREATE', '5S_AUDIT', new.id::text, to_jsonb(new), (select email from public.profiles where id = auth.uid()));
  elsif tg_op = 'UPDATE' then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, details, user_email)
    values (auth.uid(), 'UPDATE', '5S_AUDIT', new.id::text, jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)), (select email from public.profiles where id = auth.uid()));
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs (user_id, action, entity_type, entity_id, details, user_email)
    values (auth.uid(), 'DELETE', '5S_AUDIT', old.id::text, to_jsonb(old), (select email from public.profiles where id = auth.uid()));
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_audit_5s on public.audit_5s;
create trigger trg_audit_audit_5s
after insert or update or delete on public.audit_5s
for each row execute function public.audit_audit_5s_trg();

