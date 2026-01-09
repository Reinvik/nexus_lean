-- Create Quick Wins table
create table if not exists public.quick_wins (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id),
  title text not null,
  description text,
  proposed_solution text,
  status text default 'idea' check (status in ('idea', 'done')),
  impact text default 'Medio' check (impact in ('Alto', 'Medio', 'Bajo')),
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

-- Enable RLS
alter table public.quick_wins enable row level security;

-- Drop existing policies if any
drop policy if exists "Quick Wins visible for company" on public.quick_wins;
drop policy if exists "Quick Wins editable by company" on public.quick_wins;

-- SELECT Policy: Users can view Quick Wins from their company, or if assigned as responsible
create policy "Quick Wins visible for company"
  on public.quick_wins for select using (
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
      and profiles.company_id = quick_wins.company_id
    )
    OR
    -- Assigned as responsible
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.name = quick_wins.responsible
    )
    OR
    -- Global items (no company)
    quick_wins.company_id is null
  );

-- INSERT/UPDATE/DELETE Policy: Same logic for modifications
create policy "Quick Wins editable by company"
  on public.quick_wins for all using (
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
      and profiles.company_id = quick_wins.company_id
    )
    OR
    -- Assigned as responsible
    quick_wins.responsible = (select name from public.profiles where id = auth.uid())
    OR
    -- Global items (no company)
    quick_wins.company_id is null
  );

-- Create index for performance
create index if not exists quick_wins_company_id_idx on public.quick_wins(company_id);
create index if not exists quick_wins_status_idx on public.quick_wins(status);
create index if not exists quick_wins_created_at_idx on public.quick_wins(created_at);
