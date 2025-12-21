-- Tabla Quick Wins
create table if not exists public.quick_wins (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.companies(id),
  title text not null,
  description text,
  status text default 'idea', -- 'idea', 'done'
  impact text default 'Medio', -- 'Alto', 'Medio', 'Bajo'
  responsible text,
  date date default current_date,
  deadline date,
  image_url text, -- For initial image
  completion_image_url text,
  completion_comment text,
  completed_at timestamp with time zone,
  likes integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.quick_wins enable row level security;

-- Policies
drop policy if exists "Quick Wins visible for company" on public.quick_wins;
create policy "Quick Wins visible for company"
  on public.quick_wins for select using (
    -- Admin visible
    public.is_admin()
    OR
    -- Company match
    exists (
       select 1 from public.profiles
       where profiles.id = auth.uid()
       and profiles.company_id = quick_wins.company_id
    )
    OR
    -- My Tasks (Safety Net as requested)
    exists (
       select 1 from public.profiles
       where profiles.id = auth.uid()
       and profiles.name = quick_wins.responsible
    )
    OR
    -- Global Items (No Company)
    quick_wins.company_id is null
  );

drop policy if exists "Quick Wins keys editable by company" on public.quick_wins;
create policy "Quick Wins keys editable by company"
  on public.quick_wins for all using (
    public.is_admin()
    OR
    exists (
       select 1 from public.profiles
       where profiles.id = auth.uid()
       and profiles.company_id = quick_wins.company_id
    )
    OR
    quick_wins.responsible = (select name from public.profiles where id = auth.uid())
    OR
    quick_wins.company_id is null
  );
