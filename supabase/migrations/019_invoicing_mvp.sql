-- 019_invoicing_mvp.sql
-- Sprint 5 — MVP-facturatie (16_Facturatie.md, BR-020, FR-060/061/062/064-email).
--
-- Bewuste MVP-vereenvoudiging t.o.v. 11_DatabaseConcept.md § 3.6 (PRD § 19-
-- aanname, zie 00_PRD.md A-19): een 3-statusmodel (draft/sent/paid) i.p.v. het
-- volledige (draft/finalized/sent/overdue/cancelled) + los `payment_status`,
-- omdat Sprint 5 expliciet GEEN Mollie/herinneringen/incasso/creditfacturen
-- bouwt (geen reden voor "finalized" als los moment vóór "sent", geen
-- afzonderlijke `payments`-tabel nodig zolang betalen alleen handmatig
-- "markeer betaald" is). Nummering (BR-020) en de gap-loze teller-tabel
-- volgen wél de volledige, verplichte implementatie.

create type public.invoice_status as enum ('draft', 'sent', 'paid');

create table public.invoices (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  customer_id uuid not null references public.customers (id) on delete restrict,
  invoice_number varchar(50),
  status public.invoice_status not null default 'draft',
  invoice_date date not null default current_date,
  due_date date not null,
  total_amount_cents integer not null default 0,
  total_tax_cents integer not null default 0,
  currency varchar(3) not null default 'EUR',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  paid_at timestamptz,
  constraint invoices_total_amount_non_negative check (total_amount_cents >= 0),
  constraint invoices_total_tax_non_negative check (total_tax_cents >= 0)
);

comment on table public.invoices is 'Factuur (MVP: draft/sent/paid) — 16_Facturatie.md, BR-020, PRD § 19 A-19.';

create unique index idx_invoices_company_number on public.invoices (company_id, invoice_number)
  where invoice_number is not null;
create index idx_invoices_company_status on public.invoices (company_id, status, due_date);
create index idx_invoices_customer_id on public.invoices (customer_id);

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row
  execute function public.set_updated_at();

create table public.invoice_lines (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  job_id uuid references public.jobs (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  description varchar(255) not null,
  quantity numeric(10, 2) not null default 1.0,
  unit_price_cents integer not null,
  vat_rate numeric(5, 2) not null,
  vat_amount_cents integer not null,
  total_amount_cents integer not null,
  sequence integer not null default 1,
  constraint invoice_lines_quantity_positive check (quantity > 0)
);

comment on table public.invoice_lines is 'Factuurregel — 16_Facturatie.md § 4 (BTW-berekening), 11_DatabaseConcept.md § 3.6.';

create index idx_invoice_lines_invoice_id on public.invoice_lines (invoice_id);
create index idx_invoice_lines_company_id on public.invoice_lines (company_id);

-- Concurrency-veilige, gap-loze nummering (BR-020, 10_BusinessRules.md § 5) —
-- uitsluitend via next_invoice_number() hieronder, nooit rechtstreeks.
create table public.invoice_number_counters (
  company_id uuid not null references public.companies (id) on delete restrict,
  year integer not null,
  last_seq integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (company_id, year)
);

comment on table public.invoice_number_counters is 'BR-020 gap-loze teller per bedrijf/jaar — alleen gemuteerd binnen next_invoice_number().';

alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.invoice_number_counters enable row level security;

-- Rechtenmatrix 23_Gebruikersrollen.md § 2: Facturen R(eigenaar) RU(admin) R(planner) CRU(administratie) —(medewerker).
grant select on public.invoices to authenticated;
grant select on public.invoice_lines to authenticated;

create policy "owners, admins, planners and administration can read invoices"
  on public.invoices for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner', 'administration')
  );

-- Factuurregels: zelfde matrix-rij als Facturen, behalve Planner (geen R op
-- Factuurregels, wel op Facturen zelf — 23_Gebruikersrollen.md § 2).
create policy "owners, admins and administration can read invoice lines"
  on public.invoice_lines for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'administration')
  );

-- Geen directe INSERT/UPDATE-policy voor invoices/invoice_lines: aanmaken
-- gebeurt uitsluitend via complete_job() (medewerker rondt beurt af, zie
-- 020_job_completion.sql), status-overgangen (verzenden/betaald markeren)
-- uitsluitend via next_invoice_number()/mark_invoice_* hieronder — beide
-- SECURITY DEFINER, met eigen rolcontrole, analoog aan onboard_company()
-- (003_rls_baseline.sql, 41_CodingStandards.md § 8).

-- next_invoice_number() — BR-020: rij-lock binnen dezelfde transactie als de
-- aanroepende functie/actie, per bedrijf/jaar. Alleen Admin/Administratie
-- (Facturen-kolom "U", 23_Gebruikersrollen.md § 2 — Eigenaar heeft daar
-- bewust alleen R, geen U).
create function public.next_invoice_number(p_year integer, p_company_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid := public.current_company_id();
  v_seq integer;
begin
  if public.current_user_role() not in ('admin', 'administration') then
    raise exception 'Alleen Admin/Administratie mag facturen nummeren.' using errcode = '42501';
  end if;

  insert into public.invoice_number_counters (company_id, year, last_seq)
    values (v_company_id, p_year, 0)
    on conflict (company_id, year) do nothing;

  perform 1 from public.invoice_number_counters
    where company_id = v_company_id and year = p_year
    for update;

  update public.invoice_number_counters
    set last_seq = last_seq + 1, updated_at = now()
    where company_id = v_company_id and year = p_year
    returning last_seq into v_seq;

  return p_company_code || '-' || p_year::text || '-' || lpad(v_seq::text, 5, '0');
end;
$$;

revoke all on function public.next_invoice_number(integer, text) from public;
grant execute on function public.next_invoice_number(integer, text) to authenticated;

-- mark_invoice_paid() — handmatig (MVP, geen Mollie): Admin/Administratie.
create function public.mark_invoice_paid(p_invoice_id uuid)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices;
begin
  if public.current_user_role() not in ('admin', 'administration') then
    raise exception 'Alleen Admin/Administratie mag een factuur als betaald markeren.' using errcode = '42501';
  end if;

  update public.invoices
    set status = 'paid', paid_at = now()
    where id = p_invoice_id
      and company_id = public.current_company_id()
      and status = 'sent'
    returning * into v_invoice;

  if v_invoice.id is null then
    raise exception 'Factuur niet gevonden of niet in status verzonden.' using errcode = 'P0002';
  end if;

  return v_invoice;
end;
$$;

revoke all on function public.mark_invoice_paid(uuid) from public;
grant execute on function public.mark_invoice_paid(uuid) to authenticated;
