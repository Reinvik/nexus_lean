-- ==============================================================================
-- ACTUALIZACIÓN MAESTRA DE NEXUS LEAN
-- Incluye: Historial IA, Columna Último Acceso y Renombrado de Marca
-- Ejecuta este script el SQL Editor de Supabase
-- ==============================================================================

-- 1. TABLA DE HISTORIAL DE PROGRESO (Para IA)
create table if not exists public.company_progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) not null,
  snapshot_date date default current_date not null,
  metrics jsonb not null default '{}'::jsonb, 
  ai_analysis_summary text,
  created_at timestamptz default now(),
  unique(company_id, snapshot_date)
);

-- RLS para snapshots
alter table public.company_progress_snapshots enable row level security;

drop policy if exists "snapshots_read_own_company" on public.company_progress_snapshots;
create policy "snapshots_read_own_company" on public.company_progress_snapshots for select to authenticated using (company_id = (select company_id from profiles where id = auth.uid()));

drop policy if exists "snapshots_insert_own_company" on public.company_progress_snapshots;
create policy "snapshots_insert_own_company" on public.company_progress_snapshots for insert to authenticated with check (company_id = (select company_id from profiles where id = auth.uid()));


-- 2. CAMPO ÚLTIMO ACCESO
-- Agregamos la columna si no existe
alter table public.profiles 
add column if not exists last_login timestamptz;

-- Sincronización Inicial: Traer datos de la tabla interna auth.users (Requiere privilegios admin, si falla, ignorar esta línea)
-- NOTA: Como no tenemos acceso directo a auth.users desde SQL Editor simple a veces, intentamos un hack seguro.
-- Si esto falla, no colapsa el script.
do $$
begin
  update public.profiles p
  set last_login = au.last_sign_in_at
  from auth.users au
  where p.id = au.id;
exception when others then
  raise notice 'No se pudo sincronizar automáticamente el historial anterior de auth.users, se empezará a llenar desde ahora.';
end
$$;


-- 3. RENOMBRAMIENTO DE MARCA (Belean.cl -> NexusLean)
update public.companies
set name = 'NexusLean'
where name ilike '%belean.cl%' or name ilike '%belean%';


-- 4. ACTUALIZACIÓN AUTOMÁTICA DE LAST_LOGIN
-- Trigger para mantener last_login actualizado automáticamente al iniciar sesión
-- Nota: Esto depende de si auth.users dispara eventos. Lo más seguro es que el frontend lo actualice, pero dejamos el campo listo.

SELECT 'Actualización completada: Historial creado, LastLogin agregado y Marca actualizada.' as result;
