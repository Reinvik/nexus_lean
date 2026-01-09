-- ==============================================================================
-- TABLA DE HISTORIAL DE PROGRESO (Optimizada para IA)
-- Ejecuta este script en el SQL Editor de Supabase
-- ==============================================================================

create table if not exists public.company_progress_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) not null,
  
  -- Fecha del corte (snapshot)
  snapshot_date date default current_date not null,
  
  -- ALMACENAMIENTO EFICIENTE: Guardamos métricas en JSONB
  -- Ejemplo: { "fiveS_total": 50, "fiveS_closed": 45, "quick_wins": 10, "vsm_detected_waste": 5 }
  metrics jsonb not null default '{}'::jsonb, 
  
  -- Resumen cualitativo generado por la IA en ese momento (opcional, para contexto histórico)
  ai_analysis_summary text,
  
  created_at timestamptz default now(),
  
  -- RESTRICCIÓN: Solo un snapshot por día por empresa (evita duplicados innecesarios)
  unique(company_id, snapshot_date)
);

-- Habilitar seguridad
alter table public.company_progress_snapshots enable row level security;

-- POLÍTICAS RLS (Seguridad)

-- 1. Lectura: Solo ver historial de mi empresa
create policy "snapshots_read_own_company"
on public.company_progress_snapshots
for select to authenticated
using (
  company_id = (select company_id from profiles where id = auth.uid())
);

-- 2. Inserción: Permitir guardar snapshot automatico
create policy "snapshots_insert_own_company"
on public.company_progress_snapshots
for insert to authenticated
with check (
  company_id = (select company_id from profiles where id = auth.uid())
);

-- Confirmación
SELECT 'Tabla company_progress_snapshots creada correctamente.' as result;
