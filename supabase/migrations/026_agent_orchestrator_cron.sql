-- 026_agent_orchestrator_cron.sql
-- Sprint 7-afronding — pg_cron-scheduling voor de Agent Orchestrator
-- (ADR-011 § 6, "00:00–06:00 nachtelijk venster"; agent-orchestrator/index.ts
-- documenteerde dit tot nu toe als "bewust nog niet gebouwd dit sprint").
-- Geen nieuwe agent-logica: uitsluitend de ontbrekende orkestratie-trigger die
-- de al-bestaande `agent-orchestrator`-Edge-Function per actief bedrijf
-- aanroept, elke nacht om 02:00 UTC (binnen het gespecificeerde venster).
--
-- Security: de service-role-key staat NOOIT in een migratiebestand (dat komt
-- in de git-geschiedenis terecht). De functie hieronder leest hem uit
-- Supabase Vault (`vault.decrypted_secrets`, secret-naam
-- 'agent_orchestrator_service_role_key') — die secretwaarde wordt apart, buiten
-- versiebeheer om, met `select vault.create_secret(...)` ingesteld.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.run_nightly_agent_orchestrator()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_key text;
  v_project_url text := 'https://zffxxhqmefkfjpesonbt.supabase.co';
  v_company record;
begin
  select decrypted_secret into v_service_key
  from vault.decrypted_secrets
  where name = 'agent_orchestrator_service_role_key'
  limit 1;

  if v_service_key is null then
    raise warning 'run_nightly_agent_orchestrator: geen service-role-secret in Vault gevonden, cyclus overgeslagen.';
    return;
  end if;

  for v_company in
    select id from public.companies where archived_at is null
  loop
    perform net.http_post(
      url := v_project_url || '/functions/v1/agent-orchestrator',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_service_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('company_id', v_company.id)
    );
  end loop;
end;
$$;

comment on function public.run_nightly_agent_orchestrator() is
  'Roept agent-orchestrator aan voor elk actief bedrijf (ADR-011 §6). Gepland via pg_cron, zie cron.schedule hieronder.';

select cron.schedule(
  'agent-orchestrator-nightly',
  '0 2 * * *',
  $$select public.run_nightly_agent_orchestrator();$$
);
