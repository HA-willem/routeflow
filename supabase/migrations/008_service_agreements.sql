-- 008_service_agreements.sql
-- Sprint 2 — service_agreements/dienstafspraken (11_DatabaseConcept.md § 3.3,
-- 12_Entiteiten.md § 6, FR-004/FR-005) + RLS
--
-- Pulled forward uit 40_Implementatieplan.md Sprint 3 (zie 007_pricings.sql).
-- BEWUST NOG GEEN kolommen `last_completed_job_id`/`next_ideal_date`: beide
-- horen bij de horizon-laag/beurt-generatie (BR-001, FR-020), die pas landt
-- zodra de `jobs`-tabel bestaat (Sprint 3 "Planning" — buiten deze
-- sprint-scope). Ze worden in de Sprint 3-migratie toegevoegd (expand/contract,
-- 41_CodingStandards.md § 9) i.p.v. hier alvast ongebruikt te staan.

create type public.frequency_type as enum (
  'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'once', 'custom'
);
create type public.daypart as enum ('morning', 'afternoon');
create type public.service_agreement_status as enum ('active', 'paused', 'ended');

create table public.service_agreements (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  object_id uuid not null references public.objects (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  pricing_id uuid not null references public.pricings (id) on delete restrict,
  frequency_type public.frequency_type not null,
  -- Alleen betekenisvol voor weekly (7) / biweekly (14) / custom (7-365);
  -- monthly/quarterly/yearly zijn kalender-gebaseerd (BR-103) en hebben geen
  -- vaste dag-interval. De Server Action zet dit veld, niet de gebruiker.
  frequency_interval_days integer,
  preferred_day integer,
  preferred_daypart public.daypart,
  flexibility_window_days integer not null default 3,
  call_ahead_required boolean not null default false,
  exclude_dates date[],
  status public.service_agreement_status not null default 'active',
  paused_until date,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_agreements_object_service_unique unique (company_id, object_id, service_id),
  constraint service_agreements_flexibility_window_range check (
    flexibility_window_days between 0 and 21
  ),
  constraint service_agreements_preferred_day_range check (
    preferred_day is null or preferred_day between 0 and 6
  ),
  -- BR-102/FR-004: custom vereist een interval van 7-365 dagen. De expliciete
  -- "is not null" is verplicht: `null between 7 and 365` evalueert tot NULL
  -- (onbekend), niet FALSE, en een CHECK met een NULL-uitkomst laat de rij juist
  -- ONGEHINDERD door (Postgres wijst een CHECK alleen af bij een expliciete
  -- FALSE) — zonder deze clause zou een custom-afspraak zonder interval dus
  -- stilzwijgend worden geaccepteerd.
  constraint service_agreements_custom_requires_interval check (
    frequency_type <> 'custom'
    or (frequency_interval_days is not null and frequency_interval_days between 7 and 365)
  )
);

comment on table public.service_agreements is 'Dienstafspraak — 12_Entiteiten.md § 6, FR-004/FR-005.';

create index idx_service_agreements_company_id on public.service_agreements (company_id);
create index idx_service_agreements_object_id on public.service_agreements (object_id);

create trigger service_agreements_set_updated_at
  before update on public.service_agreements
  for each row
  execute function public.set_updated_at();

-- FR-005: statusmachine "active → paused → active → ended, geen teruggaan" —
-- afgedwongen op databaseniveau, niet alleen in de Server Action (10_BusinessRules.md § 1).
create function public.enforce_service_agreement_status_transition()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'ended' and new.status <> 'ended' then
    raise exception 'Een beëindigde dienstafspraak kan niet heropend worden'
      using errcode = '22000';
  end if;
  return new;
end;
$$;

create trigger service_agreements_enforce_status_transition
  before update on public.service_agreements
  for each row
  execute function public.enforce_service_agreement_status_transition();

alter table public.service_agreements enable row level security;

-- Geen DELETE: `status='ended'` is het terminale, niet-omkeerbare eindpunt
-- (FR-005, "geen teruggaan") — dit is het archiverings-equivalent voor deze
-- tabel, er is dus geen apart archived_at nodig.
grant select, insert, update on public.service_agreements to authenticated;

create policy "members can read own company service agreements"
  on public.service_agreements for select
  to authenticated
  using (company_id = public.current_company_id());

-- 23_Gebruikersrollen.md § 2: Dienstafspraken C R U D Eigenaar/Admin, C R U Planner.
create policy "owners, admins and planners can create service agreements"
  on public.service_agreements for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );

create policy "owners, admins and planners can update service agreements"
  on public.service_agreements for update
  to authenticated
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );
