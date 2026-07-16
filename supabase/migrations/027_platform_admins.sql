-- 027_platform_admins.sql
-- Sprint 11 — Platform Admin & Product Agent, fundament (ADR-013,
-- 46_PlatformAdmin.md § 1.1, BR-900). Eerste tabel die bewust BUITEN het
-- tenant-RLS-model valt (ADR-003/004): platform-admin is geen Bedrijfsrol
-- (23_Gebruikersrollen.md § 7) maar een orthogonale allowlist op `user_id`.
--
-- Bewust geen INSERT/UPDATE/DELETE-grant aan `authenticated` of
-- `service_role` — mutaties gebeuren uitsluitend handmatig via de Supabase
-- SQL Editor/Dashboard (zelfde behandeling als een secret, analoog aan het
-- `vault`-precedent in 026_agent_orchestrator_cron.sql). Geen enkel
-- applicatie-endpoint kan zichzelf platform-admin maken.

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note varchar(255),
  created_at timestamptz not null default now()
);

comment on table public.platform_admins is 'Platform-admin-allowlist — ADR-013 §1, BR-900. Uitsluitend handmatig gemuteerd (SQL Editor), geen applicatie-schrijfpad.';

alter table public.platform_admins enable row level security;

grant select on public.platform_admins to authenticated;

-- Een gebruiker mag uitsluitend de eigen rij lezen (nodig voor is_platform_admin()
-- hieronder) — nooit de volledige allowlist, dat zou platform-admin-status van
-- andere accounts lekken.
create policy "user can check own platform admin status"
  on public.platform_admins for select
  to authenticated
  using (user_id = auth.uid());

-- is_platform_admin() — de enige toegestane manier om platform-brede toegang te
-- checken (46_PlatformAdmin.md §1.2: database-RLS, Server-Action-guard én
-- UI-routing gebruiken allemaal deze functie, nooit een losse company_id-check).
create function public.is_platform_admin()
returns boolean
language sql
stable
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;
