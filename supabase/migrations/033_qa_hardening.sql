-- 033_qa_hardening.sql
-- Production-readiness-audit 2026-07-16 — vier samenhangende bevindingen uit
-- de RLS/grants-doorlichting, elk klein maar met reële impact:
--
-- (1) `distance_cache` was per ontwerp service-rol-only (015), maar de
--     service-rol had nooit SELECT/INSERT/UPDATE-grants (auto_expose_new_tables
--     staat uit sinds Sprint 7, PRD § 19 A-22 punt 6, en 015 verleende zelf
--     niets). Elke cache-read/write in lib/routing/matrix.ts faalde stil
--     (fouten worden daar bewust genegeerd t.b.v. graceful degradation) —
--     de afstandsmatrix-cache (14_RoutingEngine.md § 3) was daardoor sinds
--     Sprint 4 de facto dood en elke optimalisatie betaalde de volledige
--     Mapbox-matrixprijs opnieuw.
--
-- (2) Platform-admins konden `companies` niet lezen (alleen de eigen
--     company via de tenant-policy) — elke cross-tenant join op
--     `companies(name)` in het Platform Admin-portal (FR-953,
--     46_PlatformAdmin.md § 1.3/§ 1.4) toonde daardoor "Onbekend bedrijf".
--     Zelfde leespatroon als 030 voor agent_runs, nu voor de naamresolutie.
--
-- (3) `spatial_ref_sys` (PostGIS-systeemtabel, geen tenant-data) was via de
--     data-API volledig schrijfbaar voor anon/authenticated — iedereen met
--     de publieke anon-key kon referentiedata muteren/wissen en daarmee
--     geocoding platformbreed breken. RLS aanzetten kan niet (eigendom van
--     de extensie-rol); schrijfrechten intrekken wel. SELECT blijft staan
--     (onschadelijke, publieke referentiedata).
--
-- (4) `distance_cache`/`weerdata_cache` hadden geen RLS ("bewust", 015) maar
--     wél restgrants (TRUNCATE e.d.) aan anon/authenticated. RLS aan +
--     restgrants weg = defense-in-depth zonder functionele wijziging: de
--     service-rol heeft bypassrls en merkt er niets van.

-- (1) distance_cache: service-rol-toegang repareren (upsert vereist
-- INSERT + UPDATE; de leesweg SELECT).
grant select, insert, update on public.distance_cache to service_role;

-- (2) companies: platform-admin-leesrecht voor cross-tenant naamresolutie.
create policy "platform admins can read all companies"
  on public.companies for select
  to authenticated
  using (public.is_platform_admin());

-- (3) spatial_ref_sys: schrijfrechten intrekken voor client-rollen. De grants
-- zijn verleend door supabase_admin (de PostGIS-extensie-eigenaar, 001 —
-- `create extension postgis` zonder schema landde in public), en `postgres`
-- (de migratierol) is in Supabase géén superuser en geen lid van
-- supabase_admin — een kale REVOKE hier is dus een stille no-op. Dit blok
-- probeert het netjes en geeft anders een expliciete WARNING; de
-- daadwerkelijke intrekking moet dan éénmalig met verhoogde rechten gebeuren
-- (lokaal gedaan via `psql -U supabase_admin`, 2026-07-16; productie: zelfde
-- revoke als actiepunt in het QA-rapport — verifieer met een anon-key-DELETE
-- die 42501 moet geven).
do $$
begin
  begin
    set local role supabase_admin;
    revoke insert, update, delete, truncate on table public.spatial_ref_sys from anon, authenticated;
    reset role;
  exception when insufficient_privilege then
    reset role;
  end;
  if has_table_privilege('anon', 'public.spatial_ref_sys', 'DELETE') then
    raise warning 'spatial_ref_sys blijft schrijfbaar voor anon — trek de grants handmatig in als supabase_admin (QA-audit 2026-07-16, bevinding 3).';
  end if;
end $$;

-- (4) cache-tabellen: RLS aan (geen policies = dicht voor client-rollen;
-- service-rol heeft bypassrls) + restgrants aan client-rollen intrekken.
alter table public.distance_cache enable row level security;
alter table public.weerdata_cache enable row level security;
revoke all on table public.distance_cache from anon, authenticated;
revoke all on table public.weerdata_cache from anon, authenticated;
