-- 029_feature_requests.sql
-- Sprint 11 — Platform Admin & Product Agent, fundament (ADR-013,
-- 46_PlatformAdmin.md §2, FR-950, BR-904). Tenant-zijde feature requests:
-- standaard tenant-RLS-model (company_id, ADR-003/004), met één toegevoegde
-- SELECT-uitzondering voor platform-admins (BR-904: wél platformbreed
-- zichtbaar voor de platform-eigenaar t.b.v. triage/clustering, NOOIT
-- cross-tenant zichtbaar voor andere bedrijven).
--
-- Rechten volgen 23_Gebruikersrollen.md §2 ("Feature requests"-rij):
-- Eigenaar CRUD, Admin CRU, Planner CR, Administratie R, Medewerker geen
-- toegang.

create type public.feature_request_status as enum (
  'nieuw', 'getrieerd', 'voorgesteld', 'afgewezen', 'gepland', 'gebouwd'
);

create table public.feature_requests (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete cascade,
  -- Nullable + on delete set null (i.p.v. cascade): een request blijft
  -- zichtbaar voor het bedrijf/platform-admin ook als de indiener later
  -- gedeactiveerd/verwijderd wordt (RB-02, 23_Gebruikersrollen.md §5).
  submitted_by uuid references public.users (id) on delete set null,
  title varchar(200) not null,
  description text not null,
  context varchar(500),
  status public.feature_request_status not null default 'nieuw',
  -- Gezet door een platform-admin/Product Agent zodra dit request onderdeel
  -- wordt van een concreet voorstel (46_PlatformAdmin.md §3.3).
  linked_proposal_id uuid references public.platform_proposals (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.feature_requests is 'Tenant-ingediende feature request — ADR-013 §2, FR-950. RLS: eigen bedrijf + platform-admin-bypass (BR-904), nooit cross-tenant.';

create index idx_feature_requests_company on public.feature_requests (company_id, status);

create trigger feature_requests_set_updated_at
  before update on public.feature_requests
  for each row
  execute function public.set_updated_at();

alter table public.feature_requests enable row level security;

grant select, insert, update, delete on public.feature_requests to authenticated;

create policy "tenant reads own feature requests, platform admin reads all"
  on public.feature_requests for select
  to authenticated
  using (
    company_id = public.current_company_id()
    or public.is_platform_admin()
  );

create policy "owner/admin/planner can submit feature requests"
  on public.feature_requests for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
    and submitted_by = auth.uid()
  );

-- Twee aparte UPDATE-policies (RLS OR't ze samen): de tenant mag de eigen
-- inhoud bewerken (titel/omschrijving), de platform-admin muteert uitsluitend
-- de triage-status/koppeling — geen van beide overlapt qua bedoeld gebruik,
-- maar RLS zelf kent geen kolomgranulariteit (zelfde beperking als
-- agent_proposals, hier bewust niet met een kolomgrendel-trigger afgedwongen
-- omdat er — anders dan bij agent_proposals — geen audittrail-eis op de
-- inhoud van een feature request bestaat).
create policy "owner/admin can edit own company feature requests"
  on public.feature_requests for update
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  )
  with check (company_id = public.current_company_id());

create policy "platform admin can triage feature requests"
  on public.feature_requests for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "owner can delete own company feature requests"
  on public.feature_requests for delete
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() = 'owner'
  );
