-- 016_jobs_route_composite_index.sql
-- Sprint 4 Backend Review: 11_DatabaseConcept.md § 4 documenteert expliciet
-- `(company_id, route_id, scheduled_date)` als de vereiste index voor de
-- "Route-optimalisatie"-query (`WHERE company_id=? AND route_id IS NULL AND
-- scheduled_date BETWEEN ? AND ?`) — precies het patroon dat
-- route-optimize/index.ts gebruikt. 014_routes.sql voegde alleen een los
-- `idx_jobs_route_id` toe; deze migratie voegt de gedocumenteerde
-- samengestelde index toe. `idx_jobs_route_id` blijft staan (dekt ook losse
-- lookups op route_id alleen, bv. route-move-job's `eq('route_id', ...)`).

create index idx_jobs_company_route on public.jobs (company_id, route_id, scheduled_date);
