-- ============================================
-- RESET COMPLETO DE BASE DE DATOS NEXUS BE LEAN
-- ============================================
-- ADVERTENCIA: Este script eliminará TODOS los datos
-- Ejecutar solo si estás seguro de querer empezar de cero

-- 1. ELIMINAR POLÍTICAS RLS
drop policy if exists "Users can delete entries for their company audits" on public.audit_5s_entries;
drop policy if exists "Users can update entries for their company audits" on public.audit_5s_entries;
drop policy if exists "Users can insert entries for their company audits" on public.audit_5s_entries;
drop policy if exists "Users can view entries of their company audits" on public.audit_5s_entries;

drop policy if exists "Users can delete audit_5s for their company" on public.audit_5s;
drop policy if exists "Users can update audit_5s for their company" on public.audit_5s;
drop policy if exists "Users can insert audit_5s for their company" on public.audit_5s;
drop policy if exists "Users can view audit_5s of their company" on public.audit_5s;

drop policy if exists "Insertar perfiles" on public.profiles;
drop policy if exists "Actualizar perfiles" on public.profiles;
drop policy if exists "Ver perfiles" on public.profiles;

drop policy if exists "Admins pueden gestionar empresas" on public.companies;
drop policy if exists "Empresas visibles para todos" on public.companies;

drop policy if exists "Users can update their own images" on storage.objects;
drop policy if exists "Authenticated users can upload images" on storage.objects;
drop policy if exists "Public Access to Images" on storage.objects;

-- 2. ELIMINAR TRIGGERS Y FUNCIONES
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.is_admin();

-- 3. ELIMINAR TABLAS (en orden correcto por dependencias)
drop table if exists public.audit_5s_entries cascade;
drop table if exists public.audit_5s cascade;
drop table if exists public.profiles cascade;
drop table if exists public.companies cascade;

-- 4. ELIMINAR BUCKET DE STORAGE
delete from storage.objects where bucket_id = 'images';
delete from storage.buckets where id = 'images';

-- ============================================
-- MENSAJE DE CONFIRMACIÓN
-- ============================================
do $$
begin
  raise notice '✅ Base de datos limpiada exitosamente';
  raise notice '📝 Ahora ejecuta supabase_schema.sql para recrear todo';
end $$;
