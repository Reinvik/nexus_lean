-- SOLUCIÓN DEFINITIVA DE CONFLICTOS
-- Ejecuta esto para limpiar y recrear todo correctamente.

-- 1. Eliminar Trigger existente (Forzado)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2. Crear Tablas (Si no existen)
do $$
begin
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'companies' and n.nspname = 'public') then
    create table public.companies (
      id uuid default gen_random_uuid() primary key,
      name text not null,
      domain text not null unique,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'profiles' and n.nspname = 'public') then
    create table public.profiles (
      id uuid references auth.users not null primary key,
      email text,
      name text,
      role text default 'user', -- 'admin' o 'user'
      company_id uuid references public.companies(id),
      is_authorized boolean default false,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null
    );
  end if;
end $$;

-- 3. Habilitar RLS
alter table public.companies enable row level security;
alter table public.profiles enable row level security;

-- 4. Función de Seguridad (CRÍTICO: Evita Error 500 / Recursión)
create or replace function public.is_admin()
returns boolean as $$
begin
  -- Permite verificar si es admin sin activar políticas RLS recursivas
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superadmin' -- Changed to superadmin explicitly for logic
  );
end;
$$ language plpgsql security definer;

-- 5. Políticas de Acceso

-- EMPRESAS
drop policy if exists "Empresas visibles para todos" on public.companies;
create policy "Empresas visibles para todos"
  on public.companies for select using (auth.role() = 'authenticated');

drop policy if exists "Admins pueden gestionar empresas" on public.companies;
create policy "Admins pueden gestionar empresas"
  on public.companies for all using ( public.is_admin() );

-- PERFILES
drop policy if exists "Ver perfiles" on public.profiles;
create policy "Ver perfiles"
  on public.profiles for select using (
    auth.uid() = id
    OR
    public.is_admin()
  );

drop policy if exists "Actualizar perfiles" on public.profiles;
create policy "Actualizar perfiles"
  on public.profiles for update using (
    auth.uid() = id
    OR
    public.is_admin()
  );

drop policy if exists "Insertar perfiles" on public.profiles;
create policy "Insertar perfiles"
  on public.profiles for insert with check (auth.uid() = id);

-- 6. Trigger de Nuevo Usuario (MEJORADO PARA SUPERADMINS)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_super boolean;
  comp_id uuid;
begin
  -- Lógica Superadmin Hardcoded
  if new.email = 'ariel.mellag@gmail.com' or new.email = 'equipo@belean.cl' then
    is_super := true;
  else
    is_super := false;
  end if;

  -- Asignar Empresa Be Lean
  if new.email = 'equipo@belean.cl' then
    select id into comp_id from public.companies where domain = 'belean.cl';
  else
    comp_id := null;
  end if;

  insert into public.profiles (id, email, name, role, is_authorized, company_id)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name',
    case when is_super then 'superadmin' else 'user' end,
    case when is_super then true else false end,
    comp_id
  )
  on conflict (id) do update 
  set email = excluded.email, 
      name = excluded.name, 
      role = case when is_super then 'superadmin' else profiles.role end,
      is_authorized = case when is_super then true else profiles.is_authorized end; 
      
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. Datos y Correcciones
insert into public.companies (name, domain)
select 'CIAL Alimentos', 'cialalimentos.cl'
where not exists (select 1 from public.companies where domain = 'cialalimentos.cl');

insert into public.companies (name, domain)
select 'Transportes del Sur', 'transsur.cl'
where not exists (select 1 from public.companies where domain = 'transsur.cl');

-- 8. MÓDULO AUDITORÍA 5S
do $$
begin
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'audit_5s' and n.nspname = 'public') then
    create table public.audit_5s (
      id uuid default gen_random_uuid() primary key,
      company_id uuid references public.companies(id) not null,
      area text not null,
      auditor text not null,
      audit_date date not null,
      total_score numeric default 0,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relname = 'audit_5s_entries' and n.nspname = 'public') then
    create table public.audit_5s_entries (
      id uuid default gen_random_uuid() primary key,
      audit_id uuid references public.audit_5s(id) on delete cascade not null,
      section text not null, -- 'S1', 'S2', 'S3', 'S4', 'S5'
      question text not null,
      score integer default 0, -- 0-5
      comment text,
      created_at timestamp with time zone default timezone('utc'::text, now()) not null
    );
  end if;
end $$;

-- RLS Auditoría 5S
alter table public.audit_5s enable row level security;
alter table public.audit_5s_entries enable row level security;

-- Policies for audit_5s
drop policy if exists "Users can view audit_5s of their company" on public.audit_5s;
create policy "Users can view audit_5s of their company" on public.audit_5s
  for select using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = audit_5s.company_id
    )
    or public.is_admin()
  );

drop policy if exists "Users can insert audit_5s for their company" on public.audit_5s;
create policy "Users can insert audit_5s for their company" on public.audit_5s
  for insert with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = audit_5s.company_id
    )
    or public.is_admin()
  );
  
drop policy if exists "Users can update audit_5s for their company" on public.audit_5s;
create policy "Users can update audit_5s for their company" on public.audit_5s
  for update using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = audit_5s.company_id
    )
    or public.is_admin()
  );
  
drop policy if exists "Users can delete audit_5s for their company" on public.audit_5s;
create policy "Users can delete audit_5s for their company" on public.audit_5s
  for delete using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = audit_5s.company_id
    )
    or public.is_admin()
  );

-- Policies for audit_5s_entries
drop policy if exists "Users can view entries of their company audits" on public.audit_5s_entries;
create policy "Users can view entries of their company audits" on public.audit_5s_entries
  for select using (
    exists (
      select 1 from public.audit_5s
      join public.profiles on profiles.company_id = audit_5s.company_id
      where audit_5s.id = audit_5s_entries.audit_id
      and profiles.id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists "Users can insert entries for their company audits" on public.audit_5s_entries;
create policy "Users can insert entries for their company audits" on public.audit_5s_entries
  for insert with check (
    exists (
      select 1 from public.audit_5s
      join public.profiles on profiles.company_id = audit_5s.company_id
      where audit_5s.id = audit_5s_entries.audit_id
      and profiles.id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists "Users can update entries for their company audits" on public.audit_5s_entries;
create policy "Users can update entries for their company audits" on public.audit_5s_entries
    for update using (
        exists (
            select 1 from public.audit_5s
            join public.profiles on profiles.company_id = audit_5s.company_id
            where audit_5s.id = audit_5s_entries.audit_id
            and profiles.id = auth.uid()
        )
        or public.is_admin()
    );

drop policy if exists "Users can delete entries for their company audits" on public.audit_5s_entries;
create policy "Users can delete entries for their company audits" on public.audit_5s_entries
    for delete using (
        exists (
            select 1 from public.audit_5s
            join public.profiles on profiles.company_id = audit_5s.company_id
            where audit_5s.id = audit_5s_entries.audit_id
            and profiles.id = auth.uid()
        )
        or public.is_admin()
    );

-- 9. ACTUALIZACIONES (Add Title)
alter table public.audit_5s add column if not exists title text;

-- 10. IMAGENES Y STORAGE
-- Bucket para imágenes
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

-- Políticas de Storage
drop policy if exists "Public Access to Images" on storage.objects;
create policy "Public Access to Images"
  on storage.objects for select
  using ( bucket_id = 'images' );

drop policy if exists "Authenticated users can upload images" on storage.objects;
create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'images' and auth.role() = 'authenticated' );

-- Perfil de Usuario (Avatar)
alter table public.profiles add column if not exists avatar_url text;

-- MIGRACIÓN COMPLETA DE MÓDULOS FALTANTES (Quick Wins, VSM, A3, Tarjetas 5S)
-- Ejecuta este script en el Editor SQL de Supabase para crear todas las tablas necesarias.

-- 1. QUICK WINS
create table if not exists public.quick_wins (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id),
  title text not null,
  description text,
  status text default 'idea', 
  impact text default 'Medio',
  responsible text,
  date date default current_date,
  deadline date,
  image_url text,
  completion_image_url text,
  completion_comment text,
  completed_at timestamp with time zone,
  likes integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.quick_wins enable row level security;

-- 2. TARJETAS 5S (Distinto de Auditorías 5S)
create table if not exists public.five_s_cards (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id),
  date date default current_date,
  location text,
  article text,
  reporter text,
  reason text,
  proposed_action text,
  responsible text,
  target_date date,
  solution_date date,
  status text default 'Pendiente',
  status_color text, -- Opcional, se puede manejar en front
  type text, -- 'Clasificar', 'Ordenar', etc.
  image_before text,
  image_after text,
  card_number integer, -- Added for sequential ID
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.five_s_cards enable row level security;

-- 3. VSM (Value Stream Mapping)
create table if not exists public.vsm_projects (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id),
  name text not null,
  description text,
  responsible text,
  date date default current_date,
  status text default 'current', -- 'current', 'future'
  lead_time text,
  process_time text,
  efficiency text,
  image_url text,
  miro_link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.vsm_projects enable row level security;

-- 4. PROYECTOS A3
create table if not exists public.a3_projects (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id),
  title text not null,
  status text default 'Nuevo',
  responsible text,
  date date default current_date,
  
  -- Step 1: Definition
  background text,
  current_condition text,
  goal text,
  
  -- Step 2: Analysis
  root_cause text, -- Resumen de texto
  ishikawas jsonb default '[]'::jsonb, -- Array de diagramas
  five_whys jsonb default '[]'::jsonb, -- Array de análisis
  
  -- Step 3: Plan & Followup
  countermeasures text,
  execution_plan text, -- Texto simple del plan (campo antiguo 'plan')
  action_plan jsonb default '[]'::jsonb, -- Estructura detallada
  follow_up_notes text, -- Notas de cierre
  follow_up_data jsonb default '{}'::jsonb, -- Datos de gráficos
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.a3_projects enable row level security;

-- POLÍTICAS DE SEGURIDAD (RLS) GENÉRICAS PARA TODOS LOS MÓDULOS
-- Se aplican las mismas reglas: Admin ve todo, Usuario ve su empresa + sus asignaciones + globales.

do $$
declare
  tbl text;
begin
  foreach tbl in array ARRAY['quick_wins', 'five_s_cards', 'vsm_projects', 'a3_projects'] loop
    
    -- SELECT POLICY
    execute format('drop policy if exists "Ver %I" on public.%I', tbl, tbl);
    execute format('
      create policy "Ver %I" on public.%I for select using (
        public.is_admin()
        OR
        (company_id is not null and exists (select 1 from public.profiles where id = auth.uid() and company_id = %I.company_id))
        OR
        (responsible is not null and responsible = (select name from public.profiles where id = auth.uid()))
        OR
        company_id is null
      )', tbl, tbl, tbl);

    -- UPDATE/INSERT/DELETE POLICY (Simplificada: si puedes ver, puedes editar por ahora, o restringir más si se desea)
    execute format('drop policy if exists "Gestionar %I" on public.%I', tbl, tbl);
    execute format('
      create policy "Gestionar %I" on public.%I for all using (
        public.is_admin()
        OR
        (company_id is not null and exists (select 1 from public.profiles where id = auth.uid() and company_id = %I.company_id))
        OR
        (responsible is not null and responsible = (select name from public.profiles where id = auth.uid()))
        OR
        company_id is null
      )', tbl, tbl, tbl);
      
  end loop;
end $$;
-- 1) Crear tabla de contadores por compañía (idempotente)
CREATE TABLE IF NOT EXISTS public.company_card_counters (
  company_id uuid PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

-- 2) Asegurar UNIQUE constraint para mayor seguridad
ALTER TABLE public.five_s_cards
  ADD CONSTRAINT unique_company_card_number UNIQUE (company_id, card_number);

-- 3) Función trigger segura que respeta card_number provisto y usa contador atómico
CREATE OR REPLACE FUNCTION public.set_five_s_card_number()
RETURNS TRIGGER AS $$
DECLARE
  newnum integer;
BEGIN
  -- Si la aplicación ya proporcionó un número, no lo sobrescribimos
  IF NEW.card_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Incrementar o insertar el contador de forma atómica
  INSERT INTO public.company_card_counters(company_id, last_number)
    VALUES (NEW.company_id, 1)
  ON CONFLICT (company_id)
  DO UPDATE SET last_number = company_card_counters.last_number + 1
  RETURNING last_number INTO newnum;

  NEW.card_number := newnum;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) Crear / reemplazar trigger (antes eliminamos si existe)
DROP TRIGGER IF EXISTS trigger_set_five_s_card_number ON public.five_s_cards;

CREATE TRIGGER trigger_set_five_s_card_number
BEFORE INSERT ON public.five_s_cards
FOR EACH ROW
EXECUTE FUNCTION public.set_five_s_card_number();
