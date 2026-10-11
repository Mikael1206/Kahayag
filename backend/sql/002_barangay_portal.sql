-- Kahayag TASK-008. Source: docs/sdd.md §4 and §6.
-- Apply in the Supabase SQL editor or via DATABASE_URL after creating the Auth user.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'barangay_role') then
    create type barangay_role as enum ('tanod', 'official', 'engineer');
  end if;
end $$;

create table if not exists public.barangay_users (
  id uuid primary key references auth.users (id) on delete cascade,
  barangay_name varchar(100) not null,
  municipality varchar(100) not null,
  barangay_id varchar(100) not null,
  boundary_geom geometry(polygon, 4326),
  role barangay_role not null default 'official'
);

alter table public.barangay_users enable row level security;

drop policy if exists barangay_users_select_own on public.barangay_users;
create policy barangay_users_select_own
  on public.barangay_users
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists hazard_reports_update_official on public.hazard_reports;
create policy hazard_reports_update_official
  on public.hazard_reports
  for update
  to authenticated
  using (
    exists (
      select 1
        from public.barangay_users u
       where u.id = auth.uid()
         and (
           hazard_reports.barangay_id is null
           or hazard_reports.barangay_id = u.barangay_id
         )
    )
  )
  with check (
    exists (
      select 1
        from public.barangay_users u
       where u.id = auth.uid()
         and (
           barangay_id is null
           or barangay_id = u.barangay_id
         )
    )
  );
