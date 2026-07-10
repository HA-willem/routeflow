-- 004_customers.sql
-- Sprint 2 — customers (11_DatabaseConcept.md § 3.2, 12_Entiteiten.md § 3) + RLS
--
-- current_user_role() — gedeelde RLS-helper (analoog aan current_company_id(),
-- 002_companies_users.sql). Vanaf hier gebruiken tenant-CRUD-tabellen rol-scoping
-- naast tenant-scoping (23_Gebruikersrollen.md § 2, de functionele bron voor deze
-- policies). Niet security definer: leunt op de bestaande "members can read own
-- company users"-select-policy op public.users (003_rls_baseline.sql) — een
-- gebruiker mag altijd zijn eigen rij lezen, dus deze lookup werkt zonder RLS te
-- omzeilen.
create function public.current_user_role()
returns public.user_role
language sql
stable
as $$
  select role from public.users where id = auth.uid();
$$;

create type public.customer_type as enum ('person', 'business');
create type public.billing_preference as enum ('email', 'whatsapp', 'post');

create table public.customers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  name varchar(255) not null,
  type public.customer_type not null,
  email varchar(255),
  phone varchar(20),
  whatsapp_number varchar(20),
  whatsapp_opt_in boolean not null default false,
  email_opt_in boolean not null default true,
  billing_preference public.billing_preference not null default 'email',
  kvk_number varchar(8),
  vat_number varchar(14),
  payment_terms_days integer not null default 14,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint customers_payment_terms_days_range check (payment_terms_days between 1 and 90),
  -- FR-001 edge case: zakelijke klant vereist KVK-nummer.
  constraint customers_business_requires_kvk check (type <> 'business' or kvk_number is not null)
);

comment on table public.customers is 'Klant — 12_Entiteiten.md § 3.';

create index idx_customers_company_id on public.customers (company_id);

-- UNIQUE (company_id, email) WHERE email IS NOT NULL (11_DatabaseConcept.md § 3.2)
-- — een gewone UNIQUE-constraint zou dit ook afdwingen (NULL <> NULL in SQL), maar
-- een partiële index maakt de bedoeling expliciet en is goedkoper (geen index-entry
-- voor klanten zonder e-mailadres).
create unique index customers_company_email_unique
  on public.customers (company_id, email)
  where email is not null;

create trigger customers_set_updated_at
  before update on public.customers
  for each row
  execute function public.set_updated_at();

alter table public.customers enable row level security;

-- Geen DELETE-grant/-policy: verwijderen loopt uitsluitend via archiveren
-- (archived_at, 11_DatabaseConcept.md § 5 — "DELETE op een tabel met archived_at
-- is een codesmell"). Dit maakt BR-040 (klant met facturen niet verwijderbaar)
-- triviaal waar: er is domweg geen hard-delete-pad.
grant select, insert, update on public.customers to authenticated;

create policy "members can read own company customers"
  on public.customers for select
  to authenticated
  using (company_id = public.current_company_id());

-- 23_Gebruikersrollen.md § 2: Klanten C R U D voor Eigenaar/Admin, C R U voor
-- Planner; Administratie/Medewerker uitsluitend R (bovenstaande select-policy).
create policy "owners, admins and planners can create customers"
  on public.customers for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );

create policy "owners, admins and planners can update customers"
  on public.customers for update
  to authenticated
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );
