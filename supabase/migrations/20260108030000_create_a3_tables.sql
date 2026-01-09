-- Create A3 Projects table
create table if not exists public.a3_projects (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id),
  title text not null,
  status text default 'Nuevo' check (status in ('Nuevo', 'En Proceso', 'Cerrado')),
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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.a3_projects enable row level security;

-- Drop existing policies if any
drop policy if exists "A3 Projects visible for company" on public.a3_projects;
drop policy if exists "A3 Projects editable by company" on public.a3_projects;

-- SELECT Policy: Users can view A3 Projects from their company
create policy "A3 Projects visible for company"
  on public.a3_projects for select using (
    -- Superadmin can see all
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'superadmin'
    )
    OR
    -- Company match
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = a3_projects.company_id
    )
    OR
    -- Assigned as responsible
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.name = a3_projects.responsible
    )
    OR
    -- Global items (no company)
    a3_projects.company_id is null
  );

-- INSERT/UPDATE/DELETE Policy: Same logic for modifications
create policy "A3 Projects editable by company"
  on public.a3_projects for all using (
    -- Superadmin can edit all
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'superadmin'
    )
    OR
    -- Company match
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.company_id = a3_projects.company_id
    )
    OR
    -- Assigned as responsible
    a3_projects.responsible = (select name from public.profiles where id = auth.uid())
    OR
    -- Global items (no company)
    a3_projects.company_id is null
  );

-- Create indexes for performance
create index if not exists a3_projects_company_id_idx on public.a3_projects(company_id);
create index if not exists a3_projects_status_idx on public.a3_projects(status);
create index if not exists a3_projects_created_at_idx on public.a3_projects(created_at);
create index if not exists a3_projects_responsible_idx on public.a3_projects(responsible);
