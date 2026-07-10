-- 005_objects.sql
-- Sprint 2 — objects/werklocaties (11_DatabaseConcept.md § 3.2, 12_Entiteiten.md § 4) + RLS
--
-- `location` is BEWUST nullable (PRD § 19 A-10, afwijking van de NOT NULL in
-- 11_DatabaseConcept.md § 3.2): dit sprint bouwt geen kaart-UI/Mapbox-geocoding-
-- adapter, dus objecten worden adres-only aangemaakt. `location_status` is
-- daarom `manual` in plaats van `geocoded` totdat de geocoding-adapter er is
-- (expand/contract, 41_CodingStandards.md § 9).

create type public.object_location_status as enum ('geocoded', 'manual', 'failed');
create type public.object_type as enum ('residence', 'commercial', 'complex', 'other');

create table public.objects (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  address_line1 varchar(255) not null,
  address_line2 varchar(255),
  postal_code varchar(10) not null,
  city varchar(100) not null,
  country_code varchar(2) not null default 'NL',
  location geometry(Point, 4326),
  location_status public.object_location_status not null default 'manual',
  type public.object_type not null,
  access_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  -- 12_Entiteiten.md § 4: postcode-vorm (4 cijfers + 2 letters, bijv. "1234 AB").
  constraint objects_postal_code_format check (postal_code ~ '^[1-9][0-9]{3}\s?[A-Z]{2}$')
);

comment on table public.objects is 'Object (werklocatie) — 12_Entiteiten.md § 4.';

create index idx_objects_company_id on public.objects (company_id);
create index idx_objects_customer_id on public.objects (customer_id);
create index idx_objects_location on public.objects using gist (location);

-- FR-003: geen dubbele adressen per klant.
create unique index objects_customer_address_unique
  on public.objects (company_id, customer_id, postal_code, address_line1);

create trigger objects_set_updated_at
  before update on public.objects
  for each row
  execute function public.set_updated_at();

alter table public.objects enable row level security;

-- Geen DELETE-grant/-policy: analoog aan customers, verwijderen loopt via
-- archiveren (archived_at).
grant select, insert, update on public.objects to authenticated;

create policy "members can read own company objects"
  on public.objects for select
  to authenticated
  using (company_id = public.current_company_id());

-- 23_Gebruikersrollen.md § 2: Objecten C R U D voor Eigenaar/Admin, C R U voor
-- Planner; Administratie/Medewerker uitsluitend R (bovenstaande select-policy).
create policy "owners, admins and planners can create objects"
  on public.objects for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );

create policy "owners, admins and planners can update objects"
  on public.objects for update
  to authenticated
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );
