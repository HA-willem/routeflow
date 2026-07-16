-- 025_replanning_service_role_reads.sql
-- Sprint 7-vervolg — de nieuwe agent-replanning-Edge-Function (43_AI_Agents.md
-- §5) leest klantnamen via service_agreements -> objects -> customers om een
-- leesbare beurt-omschrijving in het diff-voorstel te tonen. `objects` en
-- `customers` stonden niet in 024_agent_service_role_reads.sql, omdat geen van
-- de Sprint 7-agents die tabellen nodig had — zelfde "auto_expose_new_tables
-- staat uit"-gat (024, ontdekt tijdens lokale end-to-end-verificatie), nu voor
-- twee extra tabellen. Uitsluitend SELECT: agent-replanning schrijft nooit
-- rechtstreeks naar deze tabellen.

grant select on public.objects to service_role;
grant select on public.customers to service_role;
