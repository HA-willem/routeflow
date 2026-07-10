-- 013_employees_availability.sql
-- Sprint 4 — employees/beschikbaarheid (11_DatabaseConcept.md § 3.5,
-- 12_Entiteiten.md, FR-021/024) + RLS. Nodig vóórdat routes (volgende
-- migratie) een employee_id-FK kan hebben.
--
-- Rechtenmatrix (23_Gebruikersrollen.md § 2, "Medewerkers & beschikbaarheid"):
-- Eigenaar/Admin C R U D op beide tabellen; Planner R op employees, C R U op
-- availability (voetnoot 7: "beheert beschikbaarheid functioneel maar wijzigt
-- geen medewerker-accounts" — dus geen U op employees zelf); Administratie R
-- op beide; Medewerker R◦/U◦ beperkt tot zijn eigen rij (voetnoot 8: kan eigen
-- beschikbaarheid melden, FR-024/BR-802).

create table public.employees (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  user_id uuid references public.users (id) on delete set null,
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  phone varchar(20) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

comment on table public.employees is 'Medewerker — 11_DatabaseConcept.md § 3.5, 23_Gebruikersrollen.md.';

create index idx_employees_company_id on public.employees (company_id);
create index idx_employees_user_id on public.employees (user_id);

create trigger employees_set_updated_at
  before update on public.employees
  for each row
  execute function public.set_updated_at();

alter table public.employees enable row level security;

-- Geen DELETE-policy: soft-delete via archived_at, analoog aan customers/objects/services.
grant select, insert, update on public.employees to authenticated;

create policy "members can read own company employees, employees read own row"
  on public.employees for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and (
      public.current_user_role() in ('owner', 'admin', 'planner', 'administration')
      or user_id = auth.uid()
    )
  );

create policy "owners and admins can create employees"
  on public.employees for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );

create policy "owners and admins can update employees"
  on public.employees for update
  to authenticated
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );

create type public.availability_status as enum ('available', 'sick', 'leave');

create table public.availability (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  employee_id uuid not null references public.employees (id) on delete restrict,
  date date not null,
  status public.availability_status not null,
  reason varchar(255),
  created_at timestamptz not null default now(),
  constraint availability_company_employee_date_unique unique (company_id, employee_id, date)
);

comment on table public.availability is 'Beschikbaarheid — 11_DatabaseConcept.md § 3.5, BR-201/BR-802.';

create index idx_availability_company_id on public.availability (company_id);
create index idx_availability_employee_id on public.availability (employee_id);
create index idx_availability_company_date on public.availability (company_id, date);

alter table public.availability enable row level security;

-- Geen UPDATE/DELETE-policy voor Medewerker zelf op status/reden verwijderen —
-- BR-802/FR-024 beschrijft "melden" (aanmaken), niet muteren/verwijderen van
-- een eerder gemelde afwezigheid; dat blijft aan Eigenaar/Admin/Planner.
grant select, insert, update, delete on public.availability to authenticated;

create policy "members can read own company availability, employees read own"
  on public.availability for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and (
      public.current_user_role() in ('owner', 'admin', 'planner', 'administration')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

create policy "planning roles and own employee can create availability"
  on public.availability for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and (
      public.current_user_role() in ('owner', 'admin', 'planner')
      or employee_id in (select id from public.employees where user_id = auth.uid())
    )
  );

create policy "owners, admins and planners can update availability"
  on public.availability for update
  to authenticated
  using (company_id = public.current_company_id())
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );

create policy "owners and admins can delete availability"
  on public.availability for delete
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );
