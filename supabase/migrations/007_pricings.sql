-- 007_pricings.sql
-- Sprint 2 — pricings/prijsafspraken (11_DatabaseConcept.md § 3.8, 18_Prijsafspraken.md)
--
-- Pulled forward uit 40_Implementatieplan.md Sprint 3 (dit sprint heet
-- "Service-overeenkomsten & Frequenties" en omvat expliciet de prijsafspraak
-- die bij elke dienstafspraak hoort). Alle 4 typen uit 18_Prijsafspraken.md § 1
-- staan in het schema (compleet datamodel), maar de UI dit sprint biedt alleen
-- `per_job`/`hourly` aan (MVP-fase per 18_Prijsafspraken.md § 1) —
-- `subscription` (V1) en `punch_card` (V2) zijn bewust nog geen UI-optie.

create type public.pricing_type as enum ('per_job', 'hourly', 'subscription', 'punch_card');
create type public.billing_period as enum ('per_job', 'weekly', 'monthly', 'quarterly');
create type public.billing_timing as enum ('advance', 'arrears');

create table public.pricings (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  type public.pricing_type not null,
  amount_cents integer,
  hourly_rate_cents integer,
  included_jobs_per_period integer,
  overage_amount_cents integer,
  billing_period public.billing_period not null default 'per_job',
  billing_timing public.billing_timing,
  punch_card_total integer,
  punch_card_remaining integer,
  vat_rate numeric(3, 1) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pricings_amount_non_negative check (amount_cents is null or amount_cents >= 0),
  constraint pricings_hourly_rate_non_negative check (
    hourly_rate_cents is null or hourly_rate_cents >= 0
  ),
  constraint pricings_overage_non_negative check (
    overage_amount_cents is null or overage_amount_cents >= 0
  ),
  constraint pricings_vat_rate_valid check (vat_rate in (0, 9, 21)),
  -- 18_Prijsafspraken.md § 4: verplichte velden per type.
  constraint pricings_type_required_fields check (
    (type = 'per_job' and amount_cents is not null)
    or (type = 'hourly' and hourly_rate_cents is not null)
    or (
      type = 'subscription'
      and amount_cents is not null
      and included_jobs_per_period is not null
      and included_jobs_per_period >= 0
      and overage_amount_cents is not null
    )
    or (type = 'punch_card' and punch_card_total is not null)
  )
);

comment on table public.pricings is 'Prijsafspraak — 12_Entiteiten.md, 18_Prijsafspraken.md.';

create index idx_pricings_company_id on public.pricings (company_id);

create trigger pricings_set_updated_at
  before update on public.pricings
  for each row
  execute function public.set_updated_at();

alter table public.pricings enable row level security;

-- Geen DELETE: een pricing-rij is 1:1 gekoppeld aan een service_agreement
-- (18_Prijsafspraken.md § 2) en heeft geen los archiveringsconcept — hij leeft
-- en sterft met de dienstafspraak die ernaar verwijst.
grant select, insert, update on public.pricings to authenticated;

create policy "members can read own company pricings"
  on public.pricings for select
  to authenticated
  using (company_id = public.current_company_id());

-- 23_Gebruikersrollen.md § 2: pricings volgt de rechten van Dienstafspraken
-- (C R U D Eigenaar/Admin, C R U Planner) — een prijsafspraak bestaat nooit los
-- van de dienstafspraak die hem gebruikt.
create policy "owners, admins and planners can create pricings"
  on public.pricings for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );

create policy "owners, admins and planners can update pricings"
  on public.pricings for update
  to authenticated
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );
