-- 017_jobs_execution.sql
-- Sprint 5 — uitvoering werkzaamheden (29_MobieleApp.md § 2.2/2.3, FR-042).
--
-- `started_at`/`completed_at` bestonden al (009_jobs.sql). Toegevoegd:
-- pauzeren/hervatten tijdens de uitvoering (Sprint 5-opdracht, geen eigen FR-
-- nummer in 29_MobieleApp.md maar wel expliciet gevraagde MVP-functionaliteit).
-- `paused_seconds` is de opgetelde pauzetijd; `actual_duration_minutes`
-- (bestaande kolom) wordt bij "Voltooien" berekend als
-- (completed_at - started_at) - paused_seconds, in lib/execution/jobs.ts.
alter table public.jobs
  add column paused_at timestamptz,
  add column paused_seconds integer not null default 0,
  add constraint jobs_paused_seconds_non_negative check (paused_seconds >= 0);

-- 009_jobs.sql liet dit bewust open: "Medewerker-specifieke R◦/U◦ (alleen eigen
-- dagroute) volgt in Sprint 5 zodra employees/route-toewijzing bestaat" — die
-- voorwaarde is sinds 013/014_routes.sql vervuld. Een medewerker mag alleen de
-- eigen dagroute (via routes.employee_id) lezen/updaten, nooit toewijzing/
-- planning-velden van andere medewerkers (23_Gebruikersrollen.md § 2 voetnoot 8).
create policy "employees can read own route jobs"
  on public.jobs for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and route_id in (
      select r.id
      from public.routes r
      join public.employees e on e.id = r.employee_id
      where e.user_id = auth.uid()
    )
  );

create policy "employees can update own route jobs"
  on public.jobs for update
  to authenticated
  using (
    company_id = public.current_company_id()
    and route_id in (
      select r.id
      from public.routes r
      join public.employees e on e.id = r.employee_id
      where e.user_id = auth.uid()
    )
  )
  with check (
    company_id = public.current_company_id()
    and route_id in (
      select r.id
      from public.routes r
      join public.employees e on e.id = r.employee_id
      where e.user_id = auth.uid()
    )
  );

comment on column public.jobs.paused_seconds is 'Opgetelde pauzetijd tijdens uitvoering (Sprint 5) — afgetrokken bij het berekenen van actual_duration_minutes.';

-- RLS is rij-niveau: de policy hierboven staat een medewerker toe om élke kolom
-- op een rij van zijn eigen route te wijzigen, niet alleen uitvoeringsvelden.
-- Dat zou een medewerker in staat stellen om via een rechtstreekse REST-call
-- (buiten de Server Action om) bijvoorbeeld `locked`, `scheduled_date` of
-- `route_id` te wijzigen — een gat t.o.v. 29_MobieleApp.md § 6 ("geen planning-
-- mutaties, behalve eigen beurt-status"). Deze trigger dwingt dat kolom-niveau
-- af voor rol `employee`; andere rollen (owner/admin/planner) zijn ongemoeid.
create function public.enforce_employee_job_update()
returns trigger
language plpgsql
as $$
begin
  if public.current_user_role() is distinct from 'employee' then
    return new;
  end if;

  if new.company_id is distinct from old.company_id
    or new.service_agreement_id is distinct from old.service_agreement_id
    or new.route_id is distinct from old.route_id
    or new.scheduled_date is distinct from old.scheduled_date
    or new.locked is distinct from old.locked
    or new.locked_until is distinct from old.locked_until
    or new.locked_reason is distinct from old.locked_reason
    or new.estimated_duration_minutes is distinct from old.estimated_duration_minutes
    or new.sequence is distinct from old.sequence
    or new.arrival_time is distinct from old.arrival_time
    or new.service_start is distinct from old.service_start
    or new.service_end is distinct from old.service_end
    or new.drive_time_from_prev_sec is distinct from old.drive_time_from_prev_sec
    or new.distance_from_prev_m is distinct from old.distance_from_prev_m
  then
    raise exception 'Medewerkers mogen alleen de status/uitvoeringsvelden van hun eigen beurt wijzigen.'
      using errcode = '42501';
  end if;

  if old.status not in ('planned', 'en_route')
    or new.status not in ('en_route', 'completed', 'not_home')
  then
    raise exception 'Ongeldige statusovergang voor medewerker-uitvoering: % -> %', old.status, new.status
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger jobs_enforce_employee_update
  before update on public.jobs
  for each row
  execute function public.enforce_employee_job_update();
