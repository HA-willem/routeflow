-- 014_routes.sql
-- Sprint 4 — routes (11_DatabaseConcept.md § 3.4, 14_RoutingEngine.md § 4.4,
-- FR-021/022) + RLS. Voegt ook de FK op `jobs.route_id` toe die
-- 009_jobs.sql bewust nog niet had (expand/contract, zie het commentaar
-- daar), plus de per-stop routevelden uit 14_RoutingEngine.md § 4.4 die geen
-- eigen tabel hebben (PRD § 19 A-12).

create table public.routes (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  employee_id uuid not null references public.employees (id) on delete restrict,
  route_date date not null,
  total_distance_meters integer,
  total_drive_time_minutes integer,
  total_work_time_minutes integer,
  sequence_version integer not null default 0,
  optimization_score numeric(5, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint routes_company_employee_date_unique unique (company_id, employee_id, route_date),
  constraint routes_optimization_score_range check (
    optimization_score is null or optimization_score between 0 and 100
  )
);

comment on table public.routes is 'Route — 11_DatabaseConcept.md § 3.4, 14_RoutingEngine.md § 4.4, FR-021/022.';

create index idx_routes_company_id on public.routes (company_id);
create index idx_routes_employee_id on public.routes (employee_id);
create index idx_routes_company_date on public.routes (company_id, route_date);

create trigger routes_set_updated_at
  before update on public.routes
  for each row
  execute function public.set_updated_at();

alter table public.routes enable row level security;

-- Geen DELETE: een route wordt leeggemaakt (jobs losgekoppeld) i.p.v.
-- verwijderd, analoog aan het geen-hard-delete-patroon bij service_agreements/jobs.
grant select, insert, update on public.routes to authenticated;

create policy "members can read own company routes, employees read own route"
  on public.routes for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and (
      public.current_user_role() in ('owner', 'admin', 'planner', 'administration')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

-- 23_Gebruikersrollen.md § 2: Routes C R U D Eigenaar/Admin, C R U Planner.
create policy "owners, admins and planners can create routes"
  on public.routes for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );

create policy "owners, admins and planners can update routes"
  on public.routes for update
  to authenticated
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );

-- FK die 009_jobs.sql bewust openliet totdat deze tabel bestond.
alter table public.jobs
  add constraint jobs_route_id_fkey foreign key (route_id) references public.routes (id) on delete set null;

create index idx_jobs_route_id on public.jobs (route_id);

-- Per-stop routevelden (14_RoutingEngine.md § 4.4, PRD § 19 A-12) — alleen
-- betekenisvol zolang route_id niet null is; blijven null voor
-- proposed/planned beurten die nog geen route hebben.
alter table public.jobs
  add column sequence integer,
  add column arrival_time timestamptz,
  add column service_start timestamptz,
  add column service_end timestamptz,
  add column drive_time_from_prev_sec integer,
  add column distance_from_prev_m integer,
  add constraint jobs_sequence_requires_route check (
    sequence is null or route_id is not null
  );
