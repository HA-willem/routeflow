-- 030_agent_runs_platform_admin_read.sql
-- Sprint 11 — Platform Admin & Product Agent, fundament (FR-953: cross-tenant
-- operationeel overzicht, 46_PlatformAdmin.md § 1.3). De bestaande
-- `agent_runs`-SELECT-policy (022_agent_pipeline.sql) is company_id-scoped
-- (planning-rollen binnen één bedrijf) — een platform-admin heeft geen
-- `company_id`-context en zou zonder deze aanvullende policy nul rijen zien.
-- Puur leesrecht, geaggregeerd over alle bedrijven; geen wijziging aan het
-- bestaande schrijfpad (service-rol, ongewijzigd).

create policy "platform admins can read all agent runs"
  on public.agent_runs for select
  to authenticated
  using (public.is_platform_admin());
