-- 037_reporting_indexes.sql
-- Sprint 10 — Rapportage-module (37_Performance.md § 3: "voorberekening waar
-- query's duur zijn"). Op de huidige/verwachte schaal (NFR-503: 5.000
-- objecten per bedrijf) volstaan gewone, geïndexeerde aggregatiequery's
-- (`lib/analytics/reporting.ts`) — geen materialized views deze ronde; de
-- twee indexen hieronder dekken de nieuwe datumbereik-gefilterde rapportage-
-- queries op `invoices`/`jobs` die nog niet door bestaande indexen gedekt
-- worden (`idx_invoices_company_status` is op `status`+`due_date`, niet
-- `invoice_date`; `idx_jobs_company_scheduled_date` is op `scheduled_date`,
-- niet `completed_at` — productiviteitsrapportage filtert op wanneer een
-- beurt daadwerkelijk is afgerond).

create index idx_invoices_company_invoice_date on public.invoices (company_id, invoice_date);

create index idx_jobs_company_completed_at on public.jobs (company_id, completed_at)
  where completed_at is not null;
