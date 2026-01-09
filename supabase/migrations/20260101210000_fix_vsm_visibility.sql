-- Fix VSM Visibility Policy to prevent "Global" viewing by regular users

-- Drop existing generic policies for VSM
drop policy if exists "Ver vsm_projects" on public.vsm_projects;
drop policy if exists "Gestionar vsm_projects" on public.vsm_projects;

-- Create stricter SELECT policy
-- Regular users can ONLY see:
-- 1. Projects belonging to their assigned company
-- 2. Projects where they are explicitly the responsible person
-- SuperAdmins (is_admin()) see EVERYTHING.
create policy "Ver vsm_projects" on public.vsm_projects for select using (
  public.is_admin()
  OR
  (company_id is not null and exists (select 1 from public.profiles where id = auth.uid() and company_id = vsm_projects.company_id))
  OR
  (responsible is not null and responsible = (select name from public.profiles where id = auth.uid()))
);

-- Create stricter MANAGEMENT policy
create policy "Gestionar vsm_projects" on public.vsm_projects for all using (
  public.is_admin()
  OR
  (company_id is not null and exists (select 1 from public.profiles where id = auth.uid() and company_id = vsm_projects.company_id))
  OR
  (responsible is not null and responsible = (select name from public.profiles where id = auth.uid()))
);
