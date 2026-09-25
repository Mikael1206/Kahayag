-- Kahayag TASK-002. Source: docs/sdd.md §4 and §6.
-- Apply in the Supabase SQL editor or via DATABASE_URL.

create extension if not exists postgis;
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'hazard_category') then
    create type hazard_category as enum (
      'busted_light',
      'unlit_street',
      'damaged_pole',
      'hazard'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'hazard_status') then
    create type hazard_status as enum (
      'reported',
      'under_inspection',
      'work_order_issued',
      'resolved'
    );
  end if;
end $$;

create table if not exists public.hazard_reports (
  id uuid primary key default gen_random_uuid(),
  latitude double precision not null,
  longitude double precision not null,
  geom geometry(point, 4326) not null,
  category hazard_category not null,
  description text,
  photo_url text,
  status hazard_status not null default 'reported',
  confirm_count integer not null default 1,
  barangay_id varchar(100),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists hazard_reports_geom_gix
  on public.hazard_reports using gist (geom);

create or replace function public.hazard_reports_set_geom()
returns trigger
language plpgsql
as $$
begin
  new.geom := st_setsrid(st_makepoint(new.longitude, new.latitude), 4326);
  return new;
end;
$$;

drop trigger if exists hazard_reports_set_geom on public.hazard_reports;
create trigger hazard_reports_set_geom
  before insert or update of latitude, longitude
  on public.hazard_reports
  for each row
  execute function public.hazard_reports_set_geom();

alter table public.hazard_reports enable row level security;

drop policy if exists hazard_reports_select_public on public.hazard_reports;
create policy hazard_reports_select_public
  on public.hazard_reports
  for select
  to anon, authenticated
  using (true);

drop policy if exists hazard_reports_insert_anon on public.hazard_reports;
create policy hazard_reports_insert_anon
  on public.hazard_reports
  for insert
  to anon, authenticated
  with check (true);

-- No UPDATE/DELETE policies for anon/authenticated.
-- Officials get scoped UPDATE in TASK-008. Service role bypasses RLS.
