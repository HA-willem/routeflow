-- 039_cron_job_status.sql
-- Sprint 10 — observability-basis: cron-zichtbaarheid in het Platform
-- Admin-portal (uitbreiding op OperationalOverview, FR-953). `cron.job_run_
-- details` (pg_cron's eigen historietabel) staat niet in `public` en is dus
-- niet via PostgREST bereikbaar — deze SECURITY DEFINER-functie ontsluit
-- alleen de laatste run per bekende cron-job, met een eigen
-- platform-admin-check (dezelfde aanpak als andere platform-admin-only
-- functies, ADR-013 §1.1) i.p.v. een RLS-policy (die kan niet op een
-- extension-schema-tabel gezet worden zonder de tabel zelf te wijzigen).

create function public.get_cron_job_status()
returns table (
  job_name text,
  last_status text,
  last_start_time timestamptz,
  last_end_time timestamptz,
  last_return_message text
)
language plpgsql
security definer
set search_path = public, cron
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Alleen platform-admins mogen cron-status inzien.' using errcode = '42501';
  end if;

  return query
    select
      j.jobname,
      d.status,
      d.start_time,
      d.end_time,
      d.return_message
    from cron.job j
    left join lateral (
      select jrd.status, jrd.start_time, jrd.end_time, jrd.return_message
      from cron.job_run_details jrd
      where jrd.jobid = j.jobid
      order by jrd.start_time desc
      limit 1
    ) d on true
    where j.jobname in ('agent-orchestrator-nightly', 'subscription-billing-monthly')
    order by j.jobname;
end;
$$;

comment on function public.get_cron_job_status() is
  'Sprint 10: laatste run per bekende pg_cron-job, uitsluitend voor platform-admins (Platform Admin-portal).';

revoke all on function public.get_cron_job_status() from public;
grant execute on function public.get_cron_job_status() to authenticated;
