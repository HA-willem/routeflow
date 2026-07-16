-- 031_invoice_agent_service_role.sql
-- Sprint 7-vervolg — Invoice Agent (43_AI_Agents.md § 8). `auto_expose_new_tables`
-- staat uit (supabase/config.toml), dus de service-rol heeft zonder een
-- expliciete grant geen toegang tot `invoices`, ook al bypassed de service-rol
-- RLS — GRANT en RLS zijn twee aparte mechanismen (024_agent_service_role_reads.sql-
-- precedent). Uitsluitend SELECT: agent-invoice signaleert alleen, schrijft nooit
-- (conceptfacturen worden al aangemaakt door complete_job(), niet door een agent).

grant select on public.invoices to service_role;
