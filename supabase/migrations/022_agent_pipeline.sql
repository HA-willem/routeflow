-- 022_agent_pipeline.sql
-- Sprint 7 — AI Execution Pipeline (ADR-012 §2/§6/§8): gedeelde opslag voor
-- agent-runs en de kandidaat-voorstellen die daaruit voortkomen. Dit is de
-- eerste migratie die de acht-agent-architectuur (ADR-011, 43_AI_Agents.md)
-- daadwerkelijk data geeft — vóór deze migratie bestond alleen de UI-laag
-- (lib/briefing/*, deze sessie) gevuld met voorbeeldcontent.
--
-- Twee tabellen, geen nieuw opslagparadigma (ADR-011 §7): `agent_runs` is de
-- technische logging per agent-aanroep (ADR-012 §8), `agent_proposals` is het
-- BR-703-explainability-schema per kandidaat-wijziging (ADR-012 §6), inclusief
-- het BR-702-goedkeuringspad. `payload` onderscheidt informatieve voorstellen
-- (Capacity/Weather — signalering, ADR-011 §12: "mag AI wél zelfstandig")
-- van uitvoerbare voorstellen (Optimization — `payload` bevat wat er bij
-- goedkeuring uitgevoerd moet worden, altijd via de bestaande, ongewijzigde
-- route-optimize-Edge-Function, nooit een nieuw schrijfpad).

create type public.agent_name as enum (
  'planning', 'replanning', 'weather', 'communication',
  'invoice', 'capacity', 'revenue', 'optimization'
);

create type public.agent_run_result as enum ('success', 'failed', 'partial');

-- Zelfde drie ernst-niveaus als BriefingWarning in de frontend
-- (lib/briefing/types.ts) — één gedeeld vocabulaire tussen UI en databron.
create type public.proposal_severity as enum ('info', 'attention', 'urgent');

-- ADR-012 §8 exact, inclusief 'auto_executed' (nog ongebruikt in Sprint 7 —
-- alle drie de sprint-7-agents blijven op automatiseringsniveau "Voorstel",
-- 15_AIPlanner.md §8 — maar het enum-lid ligt nu al vast zodat een latere
-- sprint met Semi-/Volautomatisch geen migratie hoeft toe te voegen).
create type public.proposal_approval_status as enum (
  'proposed', 'approved', 'rejected', 'expired', 'auto_executed'
);

create table public.agent_runs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete cascade,
  agent public.agent_name not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,
  result public.agent_run_result,
  candidate_count integer not null default 0,
  -- Nooit PII (41_CodingStandards.md §11) — een korte, technische omschrijving,
  -- geen klantnamen/adressen.
  error_message varchar(500),
  created_at timestamptz not null default now()
);

comment on table public.agent_runs is 'Agent-run-log — ADR-012 §8, 43_AI_Agents.md §14 (audittrail).';

create index idx_agent_runs_company_agent on public.agent_runs (company_id, agent, started_at desc);

alter table public.agent_runs enable row level security;

-- Uitsluitend service-rol schrijft (Edge Functions, ADR-008) — geen enkele
-- INSERT/UPDATE-grant aan authenticated. `auto_expose_new_tables` staat uit
-- (supabase/config.toml, "always-revoked" CLI-gedrag) — zonder een expliciete
-- grant heeft zelfs de service-rol GEEN toegang (RLS/BYPASSRLS is een apart
-- mechanisme van GRANT-rechten; service-rol omzeilt RLS-policies, niet
-- privilege-checks). Expliciet gemaakt na een lokale end-to-end-verificatie
-- die zonder deze regel een stille "0 rijen geschreven" opleverde.
grant select on public.agent_runs to authenticated;
grant select, insert, update on public.agent_runs to service_role;

create policy "planning roles can read own company agent runs"
  on public.agent_runs for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );

create table public.agent_proposals (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete cascade,
  agent_run_id uuid not null references public.agent_runs (id) on delete cascade,
  agent public.agent_name not null,
  -- De datum waar dit voorstel over gaat (niet per se `created_at::date` —
  -- een nachtcyclus die om 02:00 draait genereert voorstellen "voor vandaag").
  scheduled_date date not null,

  -- Suggestion Generator-velden (ADR-012 §2, ADR-010-diff-formaat) — 1-op-1
  -- de shape die lib/briefing/types.ts::AgentProposal al verwacht (deze
  -- sessie bouwde de UI vóór de databron; hier komt de databron overeen).
  title varchar(200) not null,
  summary text not null,

  -- Explanation Generator-velden (ADR-012 §6, BR-703).
  reasoning text not null,
  data_sources jsonb not null default '[]'::jsonb,
  business_rules jsonb not null default '[]'::jsonb,
  confidence numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  impact text not null,
  expected_gain text not null,
  alternatives text not null,
  severity public.proposal_severity not null default 'info',
  impacted_job_ids uuid[] not null default '{}'::uuid[],
  impacted_employee_ids uuid[] not null default '{}'::uuid[],

  -- NULL = informatief (Capacity/Weather-signalering, geen schrijfactie bij
  -- goedkeuring). Niet-NULL = uitvoerbaar; bevat wat de Approval Handler
  -- (app-laag, geen DB-logica) bij goedkeuring aanroept, bv.
  -- {"type": "route_optimize", "employee_id": "...", "date": "..."}.
  payload jsonb,

  -- Approval Handler-uitkomst (ADR-012 §7/§8, BR-702).
  approval_status public.proposal_approval_status not null default 'proposed',
  decided_by uuid references public.users (id) on delete set null,
  decided_at timestamptz,

  created_at timestamptz not null default now()
);

comment on table public.agent_proposals is 'AI-voorstel — ADR-012 §6 (explainability-schema) + §7 (approval), gevoed door 43_AI_Agents.md-agents, gelezen door de Morning Briefing (44_MorningBriefing_UX.md §5).';

create index idx_agent_proposals_briefing
  on public.agent_proposals (company_id, scheduled_date, approval_status);
create index idx_agent_proposals_run on public.agent_proposals (agent_run_id);

alter table public.agent_proposals enable row level security;

-- SELECT + UPDATE aan authenticated (RLS scoped) — INSERT uitsluitend
-- service-rol (agents schrijven kandidaten weg, nooit de gebruiker zelf).
-- UPDATE is nodig zodat decide_agent_proposal() (SECURITY INVOKER, hieronder)
-- binnen de sessie van de aanroeper kan schrijven — zelfde patroon als
-- start_job/pause_job/resume_job (020_job_completion.sql: SECURITY INVOKER
-- volstaat wanneer de aanroeper zelf al de benodigde GRANT+RLS heeft).
grant select, update on public.agent_proposals to authenticated;
-- service-rol schrijft de kandidaten weg (agent-orchestrator) — zie de
-- grant-motivatie hierboven bij agent_runs (auto_expose_new_tables staat uit).
grant select, insert on public.agent_proposals to service_role;

create policy "planning roles can read own company agent proposals"
  on public.agent_proposals for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );

-- De UPDATE-policy staat elke kolomwijziging toe (RLS kent geen kolomgranulariteit
-- zonder een aparte trigger); decide_agent_proposal() is het enige ondersteunde
-- schrijfpad vanuit de app (geen rechtstreekse PostgREST-update in de UI-laag) en
-- valideert zelf de statustransitie — vergelijkbaar met hoe complete_job() de
-- eigenaarschapscontrole zelf herhaalt bovenop RLS (41_CodingStandards.md §16).
create policy "planning roles can update own company agent proposals"
  on public.agent_proposals for update
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  )
  with check (company_id = public.current_company_id());

-- decide_agent_proposal() — enige toegestane mutatie op een voorstel vanuit de
-- app (BR-702: menselijke goedkeuring is de enige weg naar 'approved'/
-- 'rejected'). SECURITY INVOKER (geen DEFINER, i.t.t. complete_job): de
-- aanroeper heeft zelf al UPDATE-recht via RLS hierboven, dus geen
-- privilege-escalatie nodig — alleen een expliciete "was het nog 'proposed'"-
-- check zodat een dubbele klik of race condition geen tweede beslissing kan
-- overschrijven.
create function public.decide_agent_proposal(
  p_proposal_id uuid,
  p_approval_status public.proposal_approval_status
)
returns public.agent_proposals
language plpgsql
as $$
declare
  v_proposal public.agent_proposals;
begin
  if p_approval_status not in ('approved', 'rejected') then
    raise exception 'Alleen approved/rejected zijn toegestane beslissingen.' using errcode = '22023';
  end if;

  update public.agent_proposals
    set approval_status = p_approval_status,
        decided_by = auth.uid(),
        decided_at = now()
    where id = p_proposal_id and approval_status = 'proposed'
    returning * into v_proposal;

  if v_proposal.id is null then
    raise exception 'Voorstel niet gevonden of al behandeld.' using errcode = 'P0002';
  end if;

  return v_proposal;
end;
$$;

revoke all on function public.decide_agent_proposal(uuid, public.proposal_approval_status) from public;
grant execute on function public.decide_agent_proposal(uuid, public.proposal_approval_status) to authenticated;

-- Kolomgrendel: RLS (hierboven) kent geen kolomgranulariteit, dus een
-- rechtstreekse PostgREST-PATCH zou zonder deze trigger elk veld kunnen
-- wijzigen, inclusief reasoning/confidence — dat zou de reproduceerbaarheid
-- van het audittrail ondermijnen (ADR-012 §8, 43_AI_Agents.md §14: "Beslissingen
-- zijn reproduceerbaar"). Alleen decide_agent_proposal() (hierboven) mag
-- muteren, en uitsluitend de drie beslissingskolommen; de service-rol
-- (agent-schrijfpad) blijft ongemoeid.
create function public.enforce_agent_proposal_decision_only()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.company_id <> old.company_id
    or new.agent_run_id <> old.agent_run_id
    or new.agent <> old.agent
    or new.scheduled_date <> old.scheduled_date
    or new.title <> old.title
    or new.summary <> old.summary
    or new.reasoning <> old.reasoning
    or new.data_sources <> old.data_sources
    or new.business_rules <> old.business_rules
    or new.confidence <> old.confidence
    or new.impact <> old.impact
    or new.expected_gain <> old.expected_gain
    or new.alternatives <> old.alternatives
    or new.severity <> old.severity
    or new.impacted_job_ids <> old.impacted_job_ids
    or new.impacted_employee_ids <> old.impacted_employee_ids
    or new.payload is distinct from old.payload
  then
    raise exception 'Alleen approval_status/decided_by/decided_at zijn wijzigbaar.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger agent_proposals_decision_only
  before update on public.agent_proposals
  for each row
  execute function public.enforce_agent_proposal_decision_only();
