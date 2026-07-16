-- 032_ai_usage_tracking.sql
-- Command Bar intent-routing (ADR-014) — tokengebruik per aanroep loggen
-- t.b.v. het platform-admin kostendashboard (46_PlatformAdmin.md). Ruwe
-- tokencounts i.p.v. een vooraf berekend bedrag: kosten worden op
-- query-tijd berekend uit lib/ai/pricing.ts, zodat een latere
-- prijswijziging bij Anthropic geen historische rijen ongeldig maakt.
--
-- Zelfde tenant-RLS-model als feature_requests (029): eigen bedrijf +
-- platform-admin-bypass voor SELECT (cross-tenant overzicht, net als
-- agent_runs, 030). INSERT is self-scoped — een gebruiker kan alleen
-- gebruik onder zijn eigen company_id/user_id wegschrijven.

create table public.ai_usage_events (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  -- Welke AI-functie de aanroep deed (vooralsnog alleen de Command Bar,
  -- ADR-014) — vrije tekst i.p.v. enum zodat toekomstige agent-koppelingen
  -- (bv. Replanning-toelichtingen) geen migratie vereisen.
  feature varchar(100) not null,
  model varchar(100) not null,
  input_tokens integer not null,
  output_tokens integer not null,
  created_at timestamptz not null default now()
);

comment on table public.ai_usage_events is 'Tokengebruik per Anthropic API-aanroep (ADR-014) — bron voor het platform-admin kostendashboard. RLS: eigen bedrijf + platform-admin-bypass, nooit cross-tenant.';

create index idx_ai_usage_events_company on public.ai_usage_events (company_id, created_at);

alter table public.ai_usage_events enable row level security;

grant select, insert on public.ai_usage_events to authenticated;

create policy "tenant reads own ai usage, platform admin reads all"
  on public.ai_usage_events for select
  to authenticated
  using (
    company_id = public.current_company_id()
    or public.is_platform_admin()
  );

create policy "user logs own ai usage"
  on public.ai_usage_events for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and user_id = auth.uid()
  );
