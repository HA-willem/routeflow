-- 020_job_completion.sql
-- Sprint 5 — uitvoering-RPC's (29_MobieleApp.md § 2.2/2.3): start/pauzeren/
-- hervatten via gewone RLS+trigger (017_jobs_execution.sql), complete_job()
-- apart omdat die ook de conceptfactuur aanmaakt (FR-042/060) — een medewerker
-- heeft geen INSERT-recht op invoices/invoice_lines (23_Gebruikersrollen.md
-- § 2: Facturen "—" voor Medewerker), dus dat deel moet SECURITY DEFINER,
-- net als onboard_company() (003_rls_baseline.sql).

-- Alle vier: `language plpgsql` i.p.v. `sql`, met een expliciete "geen rij
-- geraakt"-check. Een `language sql`-functie met een non-SETOF composite
-- return geeft bij nul geraakte rijen een rij van louter NULL-kolommen terug,
-- geen echte SQL NULL — een client die alleen op `!data` test (zoals de
-- Server Actions in app/m/actions.ts) zou dat ten onrechte als succes zien.
-- RLS (017_jobs_execution.sql) blokkeert de UPDATE zelf al voor een
-- niet-eigen/verkeerd-bedrijf beurt; dit maakt dat "0 rijen geraakt"-geval
-- expliciet een fout i.p.v. een stille no-op-succes.
create function public.start_job(p_job_id uuid)
returns public.jobs
language plpgsql
as $$
declare
  v_job public.jobs;
begin
  update public.jobs
    set status = 'en_route', started_at = coalesce(started_at, now())
    where id = p_job_id and status = 'planned'
    returning * into v_job;

  if v_job.id is null then
    raise exception 'Beurt niet gevonden of niet in status gepland.' using errcode = 'P0002';
  end if;
  return v_job;
end;
$$;

create function public.pause_job(p_job_id uuid)
returns public.jobs
language plpgsql
as $$
declare
  v_job public.jobs;
begin
  update public.jobs
    set paused_at = now()
    where id = p_job_id and status = 'en_route' and paused_at is null
    returning * into v_job;

  if v_job.id is null then
    raise exception 'Beurt niet gevonden of niet onderweg/al gepauzeerd.' using errcode = 'P0002';
  end if;
  return v_job;
end;
$$;

create function public.resume_job(p_job_id uuid)
returns public.jobs
language plpgsql
as $$
declare
  v_job public.jobs;
begin
  update public.jobs
    set paused_seconds = paused_seconds + greatest(0, extract(epoch from (now() - paused_at))::integer),
        paused_at = null
    where id = p_job_id and status = 'en_route' and paused_at is not null
    returning * into v_job;

  if v_job.id is null then
    raise exception 'Beurt niet gevonden of niet gepauzeerd.' using errcode = 'P0002';
  end if;
  return v_job;
end;
$$;

create function public.mark_job_not_home(p_job_id uuid, p_reason text default null)
returns public.jobs
language plpgsql
as $$
declare
  v_job public.jobs;
begin
  update public.jobs
    set status = 'not_home', notes = coalesce(p_reason, notes)
    where id = p_job_id and status in ('planned', 'en_route')
    returning * into v_job;

  if v_job.id is null then
    raise exception 'Beurt niet gevonden of niet in een geldige status voor niet-thuis.' using errcode = 'P0002';
  end if;
  return v_job;
end;
$$;

-- complete_job() — voert zelf dezelfde eigenaarschapscontrole uit als de RLS-
-- policy/trigger in 017_jobs_execution.sql (SECURITY DEFINER omzeilt RLS, dus
-- die controle moet hier expliciet herhaald worden). Genereert de
-- conceptfactuur + factuurregel op basis van de prijsafspraak
-- (18_Prijsafspraken.md § 1): per_job → vast bedrag, hourly → uurtarief ×
-- werkelijke duur. `subscription`/`punch_card` zijn Sprint 5-buiten-scope
-- (opdracht: "Nog GEEN abonnementen") — vallen terug op de dienst-
-- standaardprijs, gedocumenteerde MVP-vereenvoudiging (zie release-report).
create function public.complete_job(p_job_id uuid, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs;
  v_is_own_route boolean;
  v_service_agreement public.service_agreements;
  v_object public.objects;
  v_customer public.customers;
  v_service public.services;
  v_pricing public.pricings;
  v_duration_minutes integer;
  v_unit_price_cents integer;
  v_vat_rate numeric(5, 2);
  v_vat_amount_cents integer;
  v_line_total_cents integer;
  v_description varchar(255);
  v_invoice public.invoices;
  v_line public.invoice_lines;
begin
  select * into v_job from public.jobs where id = p_job_id and company_id = public.current_company_id();
  if v_job.id is null then
    raise exception 'Beurt niet gevonden.' using errcode = 'P0002';
  end if;

  select exists(
    select 1
    from public.routes r
    join public.employees e on e.id = r.employee_id
    where r.id = v_job.route_id and e.user_id = auth.uid()
  ) into v_is_own_route;

  if not v_is_own_route and public.current_user_role() not in ('owner', 'admin', 'planner') then
    raise exception 'Geen toegang tot deze beurt.' using errcode = '42501';
  end if;

  if v_job.status <> 'en_route' then
    raise exception 'Beurt kan alleen afgerond worden vanuit status onderweg (huidige status: %).', v_job.status
      using errcode = 'P0001';
  end if;

  v_duration_minutes := greatest(
    1,
    round(extract(epoch from (now() - v_job.started_at)) / 60) - round(v_job.paused_seconds / 60.0)
  );

  update public.jobs
    set status = 'completed',
        completed_at = now(),
        actual_duration_minutes = v_duration_minutes,
        notes = coalesce(p_notes, notes)
    where id = p_job_id
    returning * into v_job;

  select * into v_service_agreement from public.service_agreements where id = v_job.service_agreement_id;
  select * into v_object from public.objects where id = v_service_agreement.object_id;
  select * into v_customer from public.customers where id = v_object.customer_id;
  select * into v_service from public.services where id = v_service_agreement.service_id;
  select * into v_pricing from public.pricings where id = v_service_agreement.pricing_id;

  if v_pricing.type = 'per_job' and v_pricing.amount_cents is not null then
    v_unit_price_cents := v_pricing.amount_cents;
    v_vat_rate := v_pricing.vat_rate;
  elsif v_pricing.type = 'hourly' and v_pricing.hourly_rate_cents is not null then
    v_unit_price_cents := round(v_pricing.hourly_rate_cents * v_duration_minutes / 60.0);
    v_vat_rate := v_pricing.vat_rate;
  else
    v_unit_price_cents := v_service.standard_price_cents;
    v_vat_rate := v_service.vat_rate;
  end if;

  v_vat_amount_cents := round(v_unit_price_cents * v_vat_rate / 100.0);
  v_line_total_cents := v_unit_price_cents + v_vat_amount_cents;
  v_description := v_service.name || ' — ' || v_object.address_line1 || ', ' || v_object.city
    || ' (' || to_char(v_job.scheduled_date, 'DD-MM-YYYY') || ')';

  insert into public.invoices (
    company_id, customer_id, status, invoice_date, due_date, total_amount_cents, total_tax_cents
  ) values (
    v_job.company_id,
    v_customer.id,
    'draft',
    current_date,
    current_date + v_customer.payment_terms_days,
    v_line_total_cents,
    v_vat_amount_cents
  ) returning * into v_invoice;

  insert into public.invoice_lines (
    company_id, invoice_id, job_id, service_id, description,
    quantity, unit_price_cents, vat_rate, vat_amount_cents, total_amount_cents, sequence
  ) values (
    v_job.company_id, v_invoice.id, v_job.id, v_service.id, v_description,
    1.0, v_unit_price_cents, v_vat_rate, v_vat_amount_cents, v_line_total_cents, 1
  ) returning * into v_line;

  return jsonb_build_object('job', to_jsonb(v_job), 'invoice', to_jsonb(v_invoice));
end;
$$;

revoke all on function public.start_job(uuid) from public;
revoke all on function public.pause_job(uuid) from public;
revoke all on function public.resume_job(uuid) from public;
revoke all on function public.mark_job_not_home(uuid, text) from public;
revoke all on function public.complete_job(uuid, text) from public;
grant execute on function public.start_job(uuid) to authenticated;
grant execute on function public.pause_job(uuid) to authenticated;
grant execute on function public.resume_job(uuid) to authenticated;
grant execute on function public.mark_job_not_home(uuid, text) to authenticated;
grant execute on function public.complete_job(uuid, text) to authenticated;
