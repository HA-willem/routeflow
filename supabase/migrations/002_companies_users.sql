-- 002_companies_users.sql
-- Sprint 1 — companies + users (11_DatabaseConcept.md § 3.1) + current_company_id()
--
-- users.role is (owner, admin, planner, administration, employee), gecorrigeerd in
-- 11_DatabaseConcept.md § 3.1 vóór deze migratie is geschreven (was inconsistent met
-- 23_Gebruikersrollen.md § 1 — zie docs-commit "fix users.role enum inconsistency").

create type public.subscription_tier as enum ('starter', 'pro', 'enterprise');
create type public.user_role as enum ('owner', 'admin', 'planner', 'administration', 'employee');

create table public.companies (
  id uuid primary key default uuid_generate_v4(),
  name varchar(255) not null,
  slug varchar(100) not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subscription_tier public.subscription_tier not null default 'starter',
  max_employees integer not null default 5,
  config_json jsonb not null default '{}'::jsonb,
  archived_at timestamptz,
  constraint companies_max_employees_positive check (max_employees > 0)
);

comment on table public.companies is 'Bedrijf (tenant) — 12_Entiteiten.md § 2. Enige toegangspad voor aanmaken: public.onboard_company() (zie 003_rls_baseline.sql).';

-- users.id = Supabase Auth ID (11_DatabaseConcept.md § 3.1). Verwijderen van de
-- onderliggende auth-identiteit verwijdert het profiel mee (ON DELETE CASCADE,
-- 41_CodingStandards.md § 9); dit is *niet* hetzelfde als het zachte archiveren van
-- app-data via archived_at.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  email varchar(255) not null,
  role public.user_role not null,
  full_name varchar(255) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  archived_at timestamptz,
  constraint users_company_email_unique unique (company_id, email)
);

comment on table public.users is 'Gebruiker (app-profiel) — 12_Entiteiten.md § 2. Enige toegangspad voor aanmaken: public.onboard_company() (zie 003_rls_baseline.sql).';

create index idx_users_company_id on public.users (company_id);

-- Onderhoudt updated_at automatisch (11_DatabaseConcept.md vereist deze kolom;
-- zonder trigger zou hij nooit worden bijgewerkt).
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_set_updated_at
  before update on public.companies
  for each row
  execute function public.set_updated_at();

create trigger users_set_updated_at
  before update on public.users
  for each row
  execute function public.set_updated_at();

-- current_company_id() — 22_Authenticatie.md § 6.2. Leest de tenant-context uit de
-- JWT-claim user_metadata.company_id; dit is de enige bron voor RLS-tenantscoping
-- (ADR-003/004, NFR-301).
create function public.current_company_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() -> 'user_metadata' ->> 'company_id', '')::uuid;
$$;
