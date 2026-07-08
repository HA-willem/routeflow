-- 003_rls_baseline.sql
-- Sprint 1 — RLS-baseline op companies/users (ADR-003, ADR-004, NFR-301)
--
-- Ontwerpbeslissing: companies/users hebben BEWUST geen INSERT-policy. RLS alleen
-- (company_id = current_company_id()) volstaat niet voor de allereerste schrijfactie
-- van een tenant: er ís nog geen company_id om tegen te toetsen, en een simpele
-- "insert je eigen rij"-policy op users zou een gebruiker toestaan zelf een
-- company_id van een BESTAAND bedrijf op te geven (privilege-escalatie). Daarom loopt
-- het aanmaken van een bedrijf + eigenaar-profiel uitsluitend via de SECURITY DEFINER
-- functie onboard_company() hieronder, die zelf de auth.uid()-koppeling afdwingt en
-- de reguliere RLS-restricties bewust omzeilt voor déze ene, zorgvuldig afgeschermde
-- operatie (41_CodingStandards.md § 8/§ 16).

alter table public.companies enable row level security;
alter table public.users enable row level security;

-- RLS-policies bepalen WELKE rijen zichtbaar zijn, maar vervangen niet de
-- onderliggende Postgres-tabelprivileges: zonder GRANT weigert Postgres de query
-- al vóórdat RLS er ook maar aan toekomt ("permission denied for table ..."),
-- ongeacht hoe correct de policy is. anon krijgt bewust geen rechten op deze
-- tenant-tabellen (niet-ingelogde gebruikers zien nooit bedrijfsdata).
grant select, update on public.companies to authenticated;
grant select on public.users to authenticated;

create policy "members can read own company"
  on public.companies for select
  to authenticated
  using (id = public.current_company_id());

create policy "owners and admins can update own company"
  on public.companies for update
  to authenticated
  using (id = public.current_company_id())
  with check (id = public.current_company_id());

create policy "members can read own company users"
  on public.users for select
  to authenticated
  using (company_id = public.current_company_id());

-- Geen INSERT/DELETE-policy op companies of users: RLS default-denied (zie boven).
-- Geen UPDATE-policy op users: profielbewerking is geen Sprint 1-scope; wordt
-- toegevoegd zodra die feature daadwerkelijk gebouwd wordt (MASTER_PROMPT § 3).

create function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(trim(input)), '[^a-z0-9]+', '-', 'g'));
$$;

-- onboard_company() — atomair: maakt het Bedrijf aan en koppelt de aanroepende
-- gebruiker als Eigenaar (FR-100/FR-101, 22_Authenticatie.md § 6, BR-verwant aan
-- 12_Entiteiten.md § 2 subscription_tier-limieten).
create function public.onboard_company(company_name text, owner_full_name text)
returns public.companies
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  calling_user_id uuid := auth.uid();
  calling_user_email text;
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
  new_company public.companies;
begin
  if calling_user_id is null then
    raise exception 'onboard_company vereist een ingelogde gebruiker'
      using errcode = '28000';
  end if;

  if exists (select 1 from public.users where id = calling_user_id) then
    raise exception 'Deze gebruiker heeft al een bedrijf'
      using errcode = '23505';
  end if;

  if length(trim(company_name)) = 0 then
    raise exception 'Bedrijfsnaam mag niet leeg zijn'
      using errcode = '22000';
  end if;

  if length(trim(owner_full_name)) = 0 then
    raise exception 'Naam mag niet leeg zijn'
      using errcode = '22000';
  end if;

  select email into calling_user_email from auth.users where id = calling_user_id;

  base_slug := public.slugify(company_name);
  if length(base_slug) = 0 then
    base_slug := 'bedrijf';
  end if;
  candidate_slug := base_slug;

  while exists (select 1 from public.companies where slug = candidate_slug) loop
    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || suffix;
  end loop;

  insert into public.companies (name, slug, subscription_tier, max_employees)
  values (trim(company_name), candidate_slug, 'starter', 5)
  returning * into new_company;

  insert into public.users (id, company_id, email, role, full_name)
  values (calling_user_id, new_company.id, calling_user_email, 'owner', trim(owner_full_name));

  return new_company;
end;
$$;

revoke all on function public.onboard_company(text, text) from public;
grant execute on function public.onboard_company(text, text) to authenticated;
