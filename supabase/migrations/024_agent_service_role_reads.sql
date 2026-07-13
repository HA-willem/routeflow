-- 024_agent_service_role_reads.sql
-- Sprint 7 — leesrechten voor de service-rol op bestaande tabellen die de
-- nieuwe agent-Edge-Functions (agent-capacity/agent-optimization/agent-weather/
-- agent-orchestrator) nodig hebben. Deze functies zijn de eerste code in het
-- project die deze tabellen via de service-rol leest (bestaande Edge Functions
-- als route-optimize gebruiken de anon-sleutel + doorgegeven gebruikers-JWT,
-- niet de service-rol) — vandaar dat dit gat niet eerder zichtbaar werd.
--
-- `auto_expose_new_tables` staat uit (supabase/config.toml, "always-revoked"-
-- gedrag) en gold retroactief blijkbaar ook voor tabellen die vóór die
-- instelling al bestonden zonder expliciete grant — ontdekt tijdens lokale
-- end-to-end-verificatie (agent-weather/agent-capacity/agent-optimization
-- gaven stil lege resultaten totdat dit werd toegevoegd). Uitsluitend SELECT:
-- geen van de agents schrijft rechtstreeks naar deze tabellen (Sprint 7-scope
-- is informatief of loopt via de bestaande, ongewijzigde route-optimize).

grant select on public.companies to service_role;
grant select on public.employees to service_role;
grant select on public.availability to service_role;
grant select on public.jobs to service_role;
grant select on public.routes to service_role;
grant select on public.service_agreements to service_role;
grant select on public.services to service_role;
