-- 010_service_agreements_horizon.sql
-- Sprint 3 — expand-migratie (41_CodingStandards.md § 9): voegt de
-- horizon-laag-kolommen toe aan `service_agreements` die 008_service_agreements.sql
-- bewust nog niet bevatte (die migratie legde uit dat dit pas kon zodra `jobs`
-- bestaat, zie 009_jobs.sql). 11_DatabaseConcept.md § 3.3.

alter table public.service_agreements
  add column last_completed_job_id uuid references public.jobs (id) on delete set null,
  add column next_ideal_date date;

comment on column public.service_agreements.last_completed_job_id is
  'Cache (BR-001): laatste `uitgevoerd`-beurt van deze afspraak, basis voor de volgende ideale datum.';
comment on column public.service_agreements.next_ideal_date is
  'Cache: uitkomst van lib/planning/horizon.ts calculateIdealDate() voor deze afspraak.';
