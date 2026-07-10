-- 011_service_agreements_indexes.sql
-- Architecture review (post-Sprint-3): service_agreements had indexes on
-- company_id/object_id (008_service_agreements.sql) but not on its other two
-- FK columns. Any join/lookup by service or pricing, and any FK-triggered
-- lock scan on services/pricings, was an unindexed seq scan per tenant
-- partition. last_completed_job_id (010_service_agreements_horizon.sql) has
-- the same gap; lower priority today since access is PK-only, but cheap to
-- close alongside the other two. Purely additive, no behavior change.

create index idx_service_agreements_service_id on public.service_agreements (service_id);
create index idx_service_agreements_pricing_id on public.service_agreements (pricing_id);
create index idx_service_agreements_last_completed_job_id
  on public.service_agreements (last_completed_job_id);
