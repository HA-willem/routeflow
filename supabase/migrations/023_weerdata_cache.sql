-- 023_weerdata_cache.sql
-- Sprint 7 — weer-forecast-cache (11_DatabaseConcept.md § 3.9, 15_AIPlanner.md
-- § 6.1). Schema exact zoals al gespecificeerd in 11_DatabaseConcept.md
-- (PRR-fix 2026-07-08) — deze migratie voegt niets toe aan het ontwerp, hij
-- bouwt het. Bewust GEEN company_id/RLS: weerdata is niet tenant-specifiek
-- (analoog aan distance_cache, 015_distance_cache.sql) — toegang uitsluitend
-- via de service-rol (Weather Agent-Edge-Function).

create table public.weerdata_cache (
  id uuid primary key default uuid_generate_v4(),
  area_key varchar(50) not null,
  forecast_date date not null,
  precipitation_probability numeric(5, 2),
  precipitation_mm_per_hour numeric(5, 2),
  min_temp_celsius numeric(4, 1),
  wind_bft integer,
  provider varchar(20) not null,
  cached_at timestamptz not null default now(),
  constraint weerdata_cache_area_date_provider_unique unique (area_key, forecast_date, provider)
);

comment on table public.weerdata_cache is 'Weer-forecast-cache — 11_DatabaseConcept.md § 3.9, 15_AIPlanner.md § 6.1, uitsluitend via service-rol (Edge Functions).';

create index idx_weerdata_cache_area_date on public.weerdata_cache (area_key, forecast_date, provider);

-- Geen `enable row level security` en geen grants aan anon/authenticated:
-- deze tabel is per ontwerp niet bereikbaar via de client-API (zelfde
-- motivatie als distance_cache, 015_distance_cache.sql). Wél een expliciete
-- grant aan service_role: `auto_expose_new_tables` staat uit
-- (supabase/config.toml), dus zonder deze regel heeft zelfs de service-rol
-- geen tabeltoegang (GRANT is een apart mechanisme van RLS/BYPASSRLS) —
-- ontdekt tijdens lokale end-to-end-verificatie van de Weather Agent.
grant select, insert, update on public.weerdata_cache to service_role;
