-- Drop existing complex policies
drop policy if exists "A3 Projects visible for company" on public.a3_projects;
drop policy if exists "A3 Projects editable by company" on public.a3_projects;

-- Create a single, permissive policy for authenticated users
-- This matches the requirement to remove company-specific logic
create policy "Allow All Authenticated"
  on public.a3_projects
  for all
  to authenticated
  using (true)
  with check (true);
