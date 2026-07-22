-- 038_correction_log.sql
-- Sprint 10 — V2-voorbereiding "Leren van correcties" (15_AIPlanner.md § 10).
-- Alleen het SCHRIJFPAD (zelfde precedent als Organizational Memory's
-- leeskant-deferral, PRD § 19 A-22 punt 7) — geen patroonherkenning/analyse
-- dit sprint, puur het datamodel + de hooks die corrigerende acties loggen.
--
-- Scope-beslissing: twee correction_types dit sprint — 'moved' (planner
-- verplaatst een beurt handmatig, moveJob()) en 'rejected_proposal' (planner
-- wijst een AI-voorstel af, decideProposal()). 'locked' (FR-026) is bewust
-- niet meegenomen — het enige bestaande "locked=true"-schrijfpad is
-- `addManualJob()`, dat een NIEUWE beurt aanmaakt (geen correctie op een
-- bestaande), dus geen natuurlijke fit voor deze tabel; kan later toegevoegd
-- worden zodra er een echt "vergrendel een bestaande beurt"-actie bestaat.

create type public.correction_type as enum ('moved', 'rejected_proposal');

create table public.correction_log (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  job_id uuid references public.jobs (id) on delete set null,
  correction_type public.correction_type not null,
  old_value jsonb,
  new_value jsonb,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.correction_log is
  'V2-voorbereiding (15_AIPlanner.md § 10) — logt planner-correcties (handmatige beurt-verplaatsing, voorstel-afwijzing) als ruw materiaal voor toekomstige patroonherkenning. Alleen schrijfpad dit sprint, geen leeskant/analyse.';

create index idx_correction_log_company_id on public.correction_log (company_id, created_at desc);

alter table public.correction_log enable row level security;

grant select, insert on public.correction_log to authenticated;

-- Leeskant bewust beperkt tot owner/admin (analytics-adjacent, zelfde
-- rolgrens als Rapportage — lib/navigation.ts).
create policy "owners and admins can read correction log"
  on public.correction_log for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );

-- Schrijfkant volgt wie daadwerkelijk beurten kan verplaatsen/voorstellen kan
-- afwijzen (Planning-navigatie: owner/admin/planner, lib/navigation.ts) plus
-- administration (ziet de Vandaag-briefing ook, NAV_ITEMS).
create policy "planning-capable roles can write correction log"
  on public.correction_log for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner', 'administration')
  );
