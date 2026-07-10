-- 009_jobs.sql
-- Sprint 3 — jobs/beurten (11_DatabaseConcept.md § 3.4, 12_Entiteiten.md § 7,
-- FR-020) + RLS. Horizon-laag (lib/planning/horizon.ts, BR-001/BR-102/BR-103)
-- schrijft hier `status='proposed'`-rijen naartoe via de planning-generate
-- Edge Function (ADR-008).
--
-- `route_id` verwijst naar `routes`, die pas in Sprint 4 gemigreerd wordt.
-- Expand/contract (41_CodingStandards.md § 9): de kolom bestaat al (nullable,
-- altijd NULL zolang status='proposed'), de FK-constraint volgt in de
-- Sprint 4-migratie zodra de tabel bestaat — dat is geen contract-breuk omdat
-- er nu nog geen route_id-waarden geschreven worden om te valideren.

create type public.job_status as enum (
  'proposed', 'planned', 'en_route', 'completed', 'invoiced', 'not_home', 'cancelled', 'rescheduling'
);

create table public.jobs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  service_agreement_id uuid not null references public.service_agreements (id) on delete restrict,
  route_id uuid,
  scheduled_date date not null,
  status public.job_status not null default 'proposed',
  started_at timestamptz,
  completed_at timestamptz,
  locked boolean not null default false,
  locked_until date,
  locked_reason varchar(255),
  notes text,
  estimated_duration_minutes integer not null,
  actual_duration_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_estimated_duration_positive check (estimated_duration_minutes > 0),
  constraint jobs_actual_duration_non_negative check (
    actual_duration_minutes is null or actual_duration_minutes >= 0
  ),
  -- BR-203: eenzelfde dienstafspraak kan niet 2x op dezelfde dag gepland worden.
  -- Geannuleerde beurten tellen niet mee (BR-030 annuleert toekomstige beurten
  -- bij pauzeren; een nieuwe beurt op diezelfde datum moet daarna weer kunnen).
  constraint jobs_agreement_date_unique unique (service_agreement_id, scheduled_date)
);

comment on table public.jobs is 'Beurt — 12_Entiteiten.md § 7, FR-020, BR-001/BR-102/BR-103.';

create index idx_jobs_company_scheduled_date on public.jobs (company_id, scheduled_date);
create index idx_jobs_company_status on public.jobs (company_id, status);
create index idx_jobs_service_agreement_id on public.jobs (service_agreement_id);

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row
  execute function public.set_updated_at();

alter table public.jobs enable row level security;

-- Geen DELETE: een beurt wordt geannuleerd (`status='cancelled'`), nooit
-- verwijderd — dezelfde reden als bij service_agreements (audit-trail/BR-700).
grant select, insert, update on public.jobs to authenticated;

create policy "members can read own company jobs"
  on public.jobs for select
  to authenticated
  using (company_id = public.current_company_id());

-- 23_Gebruikersrollen.md § 2: Beurten C R U D Eigenaar/Admin, C R U Planner.
-- Medewerker-specifieke R◦/U◦ (alleen eigen dagroute) volgt in Sprint 5 zodra
-- `employees`/route-toewijzing bestaat — tot die tijd is er niets om op te
-- filteren en zou een vroegtijdige policy alleen dode code zijn.
create policy "owners, admins and planners can create jobs"
  on public.jobs for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );

create policy "owners, admins and planners can update jobs"
  on public.jobs for update
  to authenticated
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );
