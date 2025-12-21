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
