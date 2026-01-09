-- ==============================================================================
-- FIX DE POLÍTICAS RLS (Seguridad) PARA EDICIÓN DE PERFILES Y ROLES
-- Ejecuta este script en el SQL Editor de Supabase para arreglar los permisos
-- ==============================================================================

-- 1. Funciones Helper de Seguridad (Si ya existen, esto las actualiza)
create or replace function public.current_company_id()
returns uuid
language sql
security definer
set search_path = public, pg_catalog, pg_temp
stable
as $$
  select company_id from public.profiles where id = auth.uid();
$$;
revoke execute on function public.current_company_id() from anon;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_catalog, pg_temp
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('superuser','superadmin') -- 'superuser' es Admin de Empresa
  );
$$;
revoke execute on function public.is_admin() from anon;

create or replace function public.is_superadmin()
returns boolean
language sql
security definer
set search_path = public, pg_catalog, pg_temp
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin' -- Admin Global
  );
$$;
revoke execute on function public.is_superadmin() from anon;

-- 2. Eliminar políticas antiguas conflictivas (limpieza)
drop policy if exists "profiles_self_update" on public.profiles;
drop policy if exists "profiles_user_self_update" on public.profiles;
drop policy if exists "profiles_admin_update_same_company" on public.profiles;
drop policy if exists "profiles_superadmin_update_all" on public.profiles;

-- 3. Crear Nuevas Políticas RLS Robustas

-- A) Usuario estándar: actualizar solo su perfil (sin tocar rol ni company)
create policy "profiles_user_self_update"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (select role from public.profiles where id = auth.uid()) -- no elevar rol
  and coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce((select company_id from public.profiles where id = auth.uid()),
                 '00000000-0000-0000-0000-000000000000'::uuid) -- no cambiar company
);

-- B) Admin (superuser): actualizar perfiles de su misma compañía
create policy "profiles_admin_update_same_company"
on public.profiles
for update
to authenticated
using (
  public.is_admin()
  and company_id = public.current_company_id()
)
with check (
  public.is_admin()
  and company_id = public.current_company_id()
);

-- C) Superadmin global: puede actualizar cualquier perfil (sin restricción)
create policy "profiles_superadmin_update_all"
on public.profiles
for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

-- 4. Optimización (Índices)
create index if not exists idx_profiles_company_id on public.profiles(company_id);
create index if not exists idx_profiles_role on public.profiles(role);

-- Confirmación
SELECT 'Permisos actualizados correctamente. Ahora los Superadmins pueden editar roles.' as result;
