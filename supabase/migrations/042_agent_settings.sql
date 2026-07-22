-- 042_agent_settings.sql
-- Sprint 7 liet automatiseringsniveau/confidence-drempel bewust hardcoded
-- ('proposal'/0.7 in agent-orchestrator en agent-replanning) "geen
-- automatiseringsniveau-instellingen-UI" — de "AI-assistent"-tegel op
-- /instellingen stond sindsdien als "Binnenkort"-placeholder. Deze migratie
-- bouwt precies wat die tegel al beloofde (15_AIPlanner.md § 8, ADR-012 § 7):
-- per bedrijf, per agent instelbaar. `decideApproval()` (lib/agents/
-- approval-handler.ts) had de volledige beslisboom al — deze tabel geeft 'm
-- eindelijk echte input i.p.v. de hardcoded default.

create type public.automation_level as enum ('proposal', 'semi_automatic', 'fully_automatic');

create table public.agent_settings (
  company_id uuid not null references public.companies (id) on delete cascade,
  agent public.agent_name not null,
  automation_level public.automation_level not null default 'proposal',
  confidence_threshold numeric(4, 3) not null default 0.700
    check (confidence_threshold >= 0 and confidence_threshold <= 1),
  updated_at timestamptz not null default now(),
  primary key (company_id, agent)
);

comment on table public.agent_settings is 'Automatiseringsniveau/confidence-drempel per agent per bedrijf — 15_AIPlanner.md § 8, ADR-012 § 7. Ontbrekende rij = default (proposal/0.7), zie lib/agents/approval-handler.ts.';

create trigger agent_settings_set_updated_at
  before update on public.agent_settings
  for each row
  execute function public.set_updated_at();

alter table public.agent_settings enable row level security;

grant select on public.agent_settings to authenticated;
grant select, insert, update on public.agent_settings to service_role;
grant insert, update on public.agent_settings to authenticated;

create policy "planning roles can read own company agent settings"
  on public.agent_settings for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner')
  );

create policy "owners and admins can set own company agent settings"
  on public.agent_settings for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  );

create policy "owners and admins can update own company agent settings"
  on public.agent_settings for update
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin')
  )
  with check (company_id = public.current_company_id());
