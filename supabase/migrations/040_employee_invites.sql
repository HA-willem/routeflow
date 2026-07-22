-- 040_employee_invites.sql
-- Sprint 12 — medewerker-uitnodigingsflow (FR-103, 22_Authenticatie.md § 8,
-- PRD § 19 A-33). Sluit een gat dat al sinds Sprint 1 gepland stond
-- (`/app/(auth)/uitnodiging/[token]`) maar nooit gebouwd is: `createEmployee()`
-- maakt vandaag alleen een `employees`-rij aan, zonder inlogaccount.
--
-- Ontwerp — zelfde precedent als onboard_company() (003_rls_baseline.sql): geen
-- service-role/Admin-API in de applicatielaag (lib/supabase/server.ts staat dat
-- expliciet niet toe, NFR-301). Twee SECURITY DEFINER-functies i.p.v. daarvan:
--   1. get_invite_by_token() — anoniem aanroepbaar, voor de uitnodigingspagina
--      vóórdat er een account is (alleen minimale, niet-gevoelige info).
--   2. accept_employee_invite() — aanroepbaar door de nu-geauthenticeerde-en-
--      bevestigde gebruiker zelf (na een normale supabase.auth.signUp() +
--      e-mailbevestiging via het bestaande /auth/confirm-pad), koppelt
--      public.users/employees.user_id — zelfde zelf-service-patroon als
--      onboard_company(), geen nieuwe infrastructuur.

create table public.invites (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  email varchar(255) not null,
  token text not null,
  role public.user_role not null default 'employee',
  invited_by uuid not null references public.users (id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invites_token_unique unique (token)
);

comment on table public.invites is 'Medewerker-uitnodiging (eigen inlogaccount) — 22_Authenticatie.md § 8, FR-103.';

create index idx_invites_company_id on public.invites (company_id);
create index idx_invites_employee_id on public.invites (employee_id);

alter table public.invites enable row level security;

-- Geen blanket-SELECT voor anon (auto_expose_new_tables staat uit, PRD § 19
-- A-22 punt 6) — anonieme token-lookup gaat uitsluitend via de hieronder
-- gedefinieerde SECURITY DEFINER-functie, nooit rechtstreeks op de tabel.
grant select, insert, delete on public.invites to authenticated;

create policy "members can read own company invites"
  on public.invites for select
  to authenticated
  using (company_id = public.current_company_id());

create policy "owners and admins can create invites"
  on public.invites for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
    and invited_by = auth.uid()
  );

create policy "owners and admins can revoke invites"
  on public.invites for delete
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );

-- Bewust geen UPDATE-policy voor authenticated tenant-leden: het accepteren
-- (het enige veld dat ooit wijzigt, accepted_at) loopt uitsluitend via
-- accept_employee_invite() hieronder, dat RLS bewust omzeilt voor déze ene
-- zorgvuldig afgeschermde operatie (zelfde precedent als onboard_company()).

-- get_invite_by_token() — laat de nog-niet-ingelogde uitgenodigde het
-- e-mailadres/bedrijfsnaam/geldigheid zien vóórdat ze een wachtwoord instellen.
-- Retourneert bewust NOOIT het token zelf terug en NOOIT of een e-mailadres al
-- wel/niet bestaat als los te doorzoeken lijst (geen enumeratie-risico: je moet
-- het exacte token al hebben, dat zit alleen in de uitnodigingsmail).
create function public.get_invite_by_token(p_token text)
returns table (email varchar, company_name varchar, valid boolean)
language sql
security definer
set search_path = public
stable
as $$
  select
    i.email,
    c.name as company_name,
    (i.accepted_at is null and i.expires_at > now()) as valid
  from public.invites i
  join public.companies c on c.id = i.company_id
  where i.token = p_token;
$$;

revoke all on function public.get_invite_by_token(text) from public;
grant execute on function public.get_invite_by_token(text) to anon, authenticated;

-- accept_employee_invite() — door de nu-geauthenticeerde gebruiker zelf
-- aangeroepen (analoog aan onboard_company()): valideert het token opnieuw
-- (server-side, kan niet omzeild worden door de client), koppelt
-- public.users/employees.user_id, markeert de uitnodiging als geaccepteerd.
create function public.accept_employee_invite(p_token text)
returns public.companies
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  calling_user_id uuid := auth.uid();
  calling_user_email text;
  matched_invite public.invites;
  employee_full_name text;
  result_company public.companies;
begin
  if calling_user_id is null then
    raise exception 'accept_employee_invite vereist een ingelogde gebruiker'
      using errcode = '28000';
  end if;

  if exists (select 1 from public.users where id = calling_user_id) then
    raise exception 'Deze gebruiker heeft al een bedrijf'
      using errcode = '23505';
  end if;

  select * into matched_invite from public.invites where token = p_token for update;

  if matched_invite is null then
    raise exception 'Uitnodiging niet gevonden' using errcode = 'P0002';
  end if;

  if matched_invite.accepted_at is not null then
    raise exception 'Uitnodiging is al gebruikt' using errcode = '23505';
  end if;

  if matched_invite.expires_at <= now() then
    raise exception 'Uitnodiging is verlopen' using errcode = '22000';
  end if;

  select email into calling_user_email from auth.users where id = calling_user_id;

  if lower(calling_user_email) <> lower(matched_invite.email) then
    raise exception 'Uitnodiging hoort bij een ander e-mailadres' using errcode = '28000';
  end if;

  select trim(first_name || ' ' || last_name)
    into employee_full_name
    from public.employees
    where id = matched_invite.employee_id;

  insert into public.users (id, company_id, email, role, full_name)
  values (
    calling_user_id,
    matched_invite.company_id,
    calling_user_email,
    matched_invite.role,
    coalesce(nullif(employee_full_name, ''), calling_user_email)
  );

  update public.employees
    set user_id = calling_user_id
    where id = matched_invite.employee_id;

  update public.invites
    set accepted_at = now()
    where id = matched_invite.id;

  select * into result_company from public.companies where id = matched_invite.company_id;
  return result_company;
end;
$$;

revoke all on function public.accept_employee_invite(text) from public;
grant execute on function public.accept_employee_invite(text) to authenticated;
