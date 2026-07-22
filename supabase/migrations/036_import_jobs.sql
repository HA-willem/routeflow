-- 036_import_jobs.sql
-- Sprint 9 (FR-006) — CSV-import klanten/objecten. Deze tabel is uitsluitend
-- een audit-/rapportagelog van een uitgevoerde import (rijtelling + per-rij
-- foutdetail) — het parsen/mappen/valideren zelf gebeurt in de app-laag
-- (lib/import/csv.ts) vóórdat deze tabel iets ziet; er is bewust geen
-- staging-tabel voor ruwe CSV-rijen (de wizard houdt gevalideerde rijen in
-- client-state tussen de validatie- en bevestigingsstap, net als
-- NieuweKlantWizard.tsx IDs tussen stappen doorgeeft).
--
-- Losstaand van `agent_runs` (022_agent_pipeline.sql): dat schema is
-- agent-specifiek (vaste `agent_name`-enum, geen rijgedetailleerde
-- foutlogging) en past niet 1-op-1 op een door-een-mens-getriggerde import
-- met per-rij foutrapport.

create type public.import_job_status as enum ('running', 'completed', 'failed');

create table public.import_jobs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  status public.import_job_status not null default 'running',
  total_rows integer not null default 0,
  success_count integer not null default 0,
  error_count integer not null default 0,
  error_log jsonb not null default '[]'::jsonb,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

comment on table public.import_jobs is 'FR-006: audit-/rapportagelog van een CSV-import klanten/objecten (rijtelling + per-rij foutdetail).';

create index idx_import_jobs_company_id on public.import_jobs (company_id, created_at desc);

alter table public.import_jobs enable row level security;

-- 23_Gebruikersrollen.md § 2 kent nog geen aparte "Import"-rij; klanten
-- importeren is functioneel gelijk aan handmatig klanten aanmaken (Eigenaar/
-- Admin/Planner CRU), dus dezelfde rollen mogen dit lezen en schrijven.
grant select, insert, update on public.import_jobs to authenticated;

create policy "owners, admins and planners can read import jobs"
  on public.import_jobs for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );

create policy "owners, admins and planners can create import jobs"
  on public.import_jobs for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );

create policy "owners, admins and planners can update own company import jobs"
  on public.import_jobs for update
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );
