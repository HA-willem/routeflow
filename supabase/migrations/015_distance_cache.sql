-- 015_distance_cache.sql
-- Sprint 4 — routing-afstandsmatrix-cache (11_DatabaseConcept.md § 3.8,
-- 14_RoutingEngine.md § 3.2). Bewust GEEN RLS/client-grants: toegang
-- uitsluitend via Edge Functions met de service-rol, nooit rechtstreeks via
-- de PostgREST data-API — analoog aan `weerdata_cache` (11 § 3.9). Geen
-- `company_id` nodig: object-id's zijn zelf al tenant-gebonden via `objects`.

create table public.distance_cache (
  from_object_id uuid not null,
  to_object_id uuid not null,
  distance_meters integer not null,
  drive_time_seconds integer not null,
  profile varchar(20) not null default 'driving',
  provider varchar(20) not null,
  cached_at timestamptz not null default now(),
  primary key (from_object_id, to_object_id, provider)
);

comment on table public.distance_cache is 'Afstandsmatrix-cache — 14_RoutingEngine.md § 3, uitsluitend via service-rol (Edge Functions).';

create index idx_distance_cache_cached_at on public.distance_cache (cached_at);

-- `from_object_id`/`to_object_id` verwijzen naar `objects.id` óf een
-- pseudo-id voor het bedrijfsadres (14 § 3.2, "Startlocatie... krijgt een
-- pseudo-object-id") — daarom bewust geen FK-constraint naar `objects`.

-- Geen `enable row level security` en geen grants aan anon/authenticated:
-- deze tabel is per ontwerp niet bereikbaar via de client-API.
