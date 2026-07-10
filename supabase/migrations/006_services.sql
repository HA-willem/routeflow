-- 006_services.sql
-- Sprint 2 — services/diensten (11_DatabaseConcept.md § 3.3, 12_Entiteiten.md § 5) + RLS

create type public.weather_sensitivity_type as enum ('rain', 'frost', 'wind');

create table public.services (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  name varchar(255) not null,
  description text,
  standard_duration_minutes integer not null,
  standard_price_cents integer not null,
  vat_rate numeric(3, 1) not null default 21.0,
  is_weather_sensitive boolean not null default false,
  weather_sensitivity_type public.weather_sensitivity_type,
  icon varchar(50),
  color_hex varchar(7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint services_duration_range check (standard_duration_minutes between 15 and 480),
  constraint services_price_non_negative check (standard_price_cents >= 0),
  constraint services_vat_rate_valid check (vat_rate in (0, 9, 21)),
  constraint services_weather_sensitivity_requires_type check (
    not is_weather_sensitive or weather_sensitivity_type is not null
  )
);

comment on table public.services is 'Dienst — 12_Entiteiten.md § 5.';

create index idx_services_company_id on public.services (company_id);

create trigger services_set_updated_at
  before update on public.services
  for each row
  execute function public.set_updated_at();

alter table public.services enable row level security;

-- Geen DELETE-grant/-policy: analoog aan customers/objects, verwijderen loopt
-- via archiveren (archived_at).
grant select, insert, update on public.services to authenticated;

create policy "members can read own company services"
  on public.services for select
  to authenticated
  using (company_id = public.current_company_id());

-- 23_Gebruikersrollen.md § 2: Diensten C R U D uitsluitend voor Eigenaar/Admin
-- (Planner/Administratie/Medewerker hebben alleen R, bovenstaande select-policy)
-- — anders dan customers/objects, waar Planner ook C/U mag.
create policy "owners and admins can create services"
  on public.services for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );

create policy "owners and admins can update services"
  on public.services for update
  to authenticated
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );
