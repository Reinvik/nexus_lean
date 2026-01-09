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
    where id = auth.uid() and role = 'admin'
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

-- 6. Trigger de Nuevo Usuario
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'name',
    case when new.email = 'ariel.mellag@gmail.com' then 'admin' else 'user' end
  )
  on conflict (id) do update 
  set email = excluded.email, name = excluded.name; 
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

-- Asegurar rol de Admin Supremo
update public.profiles 
set role = 'admin', is_authorized = true
where email = 'ariel.mellag@gmail.com';

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

