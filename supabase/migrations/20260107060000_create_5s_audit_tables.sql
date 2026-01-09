 -- Create audit_5s table
create table audit_5s (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) on delete cascade not null,
  title text,
  area text not null,
  auditor text not null,
  audit_date date not null default current_date,
  total_score numeric(4, 2) default 0,
  created_at timestamptz default now()
);

-- Create audit_5s_entries table
create table audit_5s_entries (
  id uuid default gen_random_uuid() primary key,
  audit_id uuid references audit_5s(id) on delete cascade not null,
  section text not null, -- S1, S2, S3, S4, S5
  question text not null,
  score numeric(4, 2) default 0,
  comment text
);

-- Enable RLS
alter table audit_5s enable row level security;
alter table audit_5s_entries enable row level security;

-- Policies for audit_5s
create policy "Users can view audits from their company"
  on audit_5s for select
  using (
    company_id in (
      select company_id from profiles
      where id = auth.uid()
    )
  );

create policy "Users can insert audits for their company"
  on audit_5s for insert
  with check (
    company_id in (
      select company_id from profiles
      where id = auth.uid()
    )
  );

create policy "Users can update audits from their company"
  on audit_5s for update
  using (
    company_id in (
      select company_id from profiles
      where id = auth.uid()
    )
  );

create policy "Users can delete audits from their company"
  on audit_5s for delete
  using (
    company_id in (
      select company_id from profiles
      where id = auth.uid()
    )
  );

-- Policies for audit_5s_entries
-- Since entries depend on audits, we check the parent audit's company_id
create policy "Users can view entries from their company's audits"
  on audit_5s_entries for select
  using (
    exists (
      select 1 from audit_5s
      where audit_5s.id = audit_5s_entries.audit_id
      and audit_5s.company_id in (
        select company_id from profiles
        where id = auth.uid()
      )
    )
  );

create policy "Users can insert entries for their company's audits"
  on audit_5s_entries for insert
  with check (
    exists (
      select 1 from audit_5s
      where audit_5s.id = audit_5s_entries.audit_id
      and audit_5s.company_id in (
        select company_id from profiles
        where id = auth.uid()
      )
    )
  );

create policy "Users can update entries from their company's audits"
  on audit_5s_entries for update
  using (
    exists (
      select 1 from audit_5s
      where audit_5s.id = audit_5s_entries.audit_id
      and audit_5s.company_id in (
        select company_id from profiles
        where id = auth.uid()
      )
    )
  );

create policy "Users can delete entries from their company's audits"
  on audit_5s_entries for delete
  using (
    exists (
      select 1 from audit_5s
      where audit_5s.id = audit_5s_entries.audit_id
      and audit_5s.company_id in (
        select company_id from profiles
        where id = auth.uid()
      )
    )
  );

-- Create indexes for performance
create index audit_5s_company_id_idx on audit_5s(company_id);
create index audit_5s_audit_date_idx on audit_5s(audit_date);
create index audit_5s_entries_audit_id_idx on audit_5s_entries(audit_id);
