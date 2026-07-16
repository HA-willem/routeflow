-- 028_platform_proposals.sql
-- Sprint 11 — Platform Admin & Product Agent, fundament (ADR-013,
-- 46_PlatformAdmin.md §3/§4, BR-901/902/903). Voorstellen tot codewijziging
-- (branch + Pull Request), uitsluitend zichtbaar/beoordeelbaar door
-- platform-admins (is_platform_admin(), 027_platform_admins.sql) — nooit per
-- tenant, dit is geen `agent_proposals`-achtige tenant-tabel.
--
-- Sprint 11 bouwt uitsluitend het HANDMATIGE pad (platform-admin maakt zelf
-- een voorstel aan, keurt het goed/af, registreert een merge). De
-- geautomatiseerde Product Agent-run die hier zelf naar schrijft (FR-951) is
-- expliciet uitgesteld naar "Sprint 11-vervolg" (40_Implementatieplan.md) —
-- de `service_role`-insert-grant hieronder ligt nu al vast (zelfde precedent
-- als het `auto_executed`-enum-lid in 022_agent_pipeline.sql: "nog ongebruikt
-- ... maar ligt al vast zodat een latere sprint geen migratie hoeft toe te
-- voegen").

create type public.proposal_risk_level as enum ('normal', 'high_risk');

-- 'merged' wordt nooit door de Product Agent of door decide_platform_proposal()
-- gezet — uitsluitend via mark_platform_proposal_merged() hieronder, ná een
-- daadwerkelijke, handmatige git-merge door de platform-eigenaar (BR-901: de
-- merge zelf is nooit een applicatie-actie, dit is uitsluitend boekhouding
-- achteraf).
create type public.platform_proposal_status as enum ('open', 'approved', 'rejected', 'merged');

create table public.platform_proposals (
  id uuid primary key default uuid_generate_v4(),
  title varchar(200) not null,
  pr_url varchar(500),

  -- Voorstel-contract (BR-903, analoog BR-703-Explainability maar voor code
  -- i.p.v. planning).
  trigger_summary text not null,
  risk_level public.proposal_risk_level not null default 'normal',
  alternatives_considered text not null default '',
  -- Losse array i.p.v. een join-tabel — zelfde patroon als
  -- agent_proposals.impacted_job_ids (022_agent_pipeline.sql): geen
  -- referentiële integriteit nodig voor een puur informatieve koppeling.
  linked_feature_request_ids uuid[] not null default '{}'::uuid[],

  status public.platform_proposal_status not null default 'open',
  decided_by uuid references public.users (id) on delete set null,
  decided_at timestamptz,

  created_at timestamptz not null default now()
);

comment on table public.platform_proposals is 'Product Agent-voorstel (codewijziging via PR) — ADR-013 §3/§4, BR-901/902/903. Uitsluitend zichtbaar voor platform-admins.';

create index idx_platform_proposals_status on public.platform_proposals (status, created_at desc);

alter table public.platform_proposals enable row level security;

-- authenticated: platform-admin kan in Sprint 11 zelf een (test-/demo-)voorstel
-- aanmaken (46_PlatformAdmin.md "Volgende stap": nog geen geautomatiseerde
-- run). service_role: gereserveerd voor de Product Agent (Sprint 11-vervolg),
-- zelfde grant-vorm als agent_runs/agent_proposals (auto_expose_new_tables
-- staat uit, 022_agent_pipeline.sql-precedent).
grant select, insert, update on public.platform_proposals to authenticated;
grant select, insert on public.platform_proposals to service_role;

create policy "platform admins can read proposals"
  on public.platform_proposals for select
  to authenticated
  using (public.is_platform_admin());

create policy "platform admins can create proposals"
  on public.platform_proposals for insert
  to authenticated
  with check (public.is_platform_admin());

-- UPDATE-policy staat elke kolomwijziging toe (RLS kent geen
-- kolomgranulariteit); de kolomgrendel-trigger hieronder dwingt af dat een
-- platform-admin uitsluitend via decide_platform_proposal()/
-- mark_platform_proposal_merged() muteert — zelfde patroon als
-- agent_proposals_decision_only (022_agent_pipeline.sql).
create policy "platform admins can decide on proposals"
  on public.platform_proposals for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- decide_platform_proposal() — open → approved/rejected. "approved" betekent
-- uitsluitend "deze PR mag gemerged worden" (46_PlatformAdmin.md §4); de
-- merge zelf blijft een losse, handmatige git-actie buiten deze functie om.
create function public.decide_platform_proposal(
  p_proposal_id uuid,
  p_status public.platform_proposal_status
)
returns public.platform_proposals
language plpgsql
as $$
declare
  v_proposal public.platform_proposals;
begin
  if not public.is_platform_admin() then
    raise exception 'Uitsluitend platform-admins mogen voorstellen beoordelen.' using errcode = '42501';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Alleen approved/rejected zijn toegestane beslissingen via dit pad.' using errcode = '22023';
  end if;

  update public.platform_proposals
    set status = p_status,
        decided_by = auth.uid(),
        decided_at = now()
    where id = p_proposal_id and status = 'open'
    returning * into v_proposal;

  if v_proposal.id is null then
    raise exception 'Voorstel niet gevonden of al behandeld.' using errcode = 'P0002';
  end if;

  return v_proposal;
end;
$$;

revoke all on function public.decide_platform_proposal(uuid, public.platform_proposal_status) from public;
grant execute on function public.decide_platform_proposal(uuid, public.platform_proposal_status) to authenticated;

-- mark_platform_proposal_merged() — approved → merged. Puur boekhouding: dit
-- voert geen merge uit (dat gebeurt in git, buiten de applicatie om, BR-901),
-- het registreert alleen dat het al is gebeurd.
create function public.mark_platform_proposal_merged(p_proposal_id uuid)
returns public.platform_proposals
language plpgsql
as $$
declare
  v_proposal public.platform_proposals;
begin
  if not public.is_platform_admin() then
    raise exception 'Uitsluitend platform-admins mogen dit registreren.' using errcode = '42501';
  end if;

  update public.platform_proposals
    set status = 'merged'
    where id = p_proposal_id and status = 'approved'
    returning * into v_proposal;

  if v_proposal.id is null then
    raise exception 'Voorstel niet gevonden of nog niet goedgekeurd.' using errcode = 'P0002';
  end if;

  return v_proposal;
end;
$$;

revoke all on function public.mark_platform_proposal_merged(uuid) from public;
grant execute on function public.mark_platform_proposal_merged(uuid) to authenticated;

create function public.enforce_platform_proposal_decision_only()
returns trigger
language plpgsql
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.title <> old.title
    or new.pr_url is distinct from old.pr_url
    or new.trigger_summary <> old.trigger_summary
    or new.risk_level <> old.risk_level
    or new.alternatives_considered <> old.alternatives_considered
    or new.linked_feature_request_ids <> old.linked_feature_request_ids
  then
    raise exception 'Alleen status/decided_by/decided_at zijn wijzigbaar.' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger platform_proposals_decision_only
  before update on public.platform_proposals
  for each row
  execute function public.enforce_platform_proposal_decision_only();
