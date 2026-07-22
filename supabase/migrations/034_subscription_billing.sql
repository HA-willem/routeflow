-- 034_subscription_billing.sql
-- Sprint 9 (FR-066/BR-304) — abonnementsfacturatie. `pricings.type = 'subscription'`
-- bestaat al sinds 007_pricings.sql (volledig schema: amount_cents,
-- included_jobs_per_period, overage_amount_cents, billing_period, billing_timing)
-- maar had tot nu toe geen UI-optie en geen generatiepad — complete_job()
-- (020_job_completion.sql) viel voor dit type terug op de dienst-standaardprijs
-- (Sprint 5-documented MVP-vereenvoudiging: "Nog GEEN abonnementen"). Dit
-- migratiebestand doet twee dingen:
--   1. Patcht complete_job() zodat een subscription-beurt GEEN eigen
--      conceptfactuur meer aanmaakt (dat zou dubbel factureren betekenen
--      bovenop de maandelijkse abonnementsfactuur hieronder) — de beurt wordt
--      nog steeds normaal afgerond, alleen het `invoice`-jsonb-veld is null.
--      punch_card (V2, nog geen UI-optie, dus in de praktijk onbereikbaar)
--      behoudt het bestaande fallback-gedrag ongewijzigd.
--   2. Voegt de generatie zelf toe: geen nieuwe Edge Function nodig (in
--      tegenstelling tot 026_agent_orchestrator_cron.sql, dat een externe
--      LLM-call moet doen) — dit is zuiver een DB-operatie, dus één
--      SECURITY DEFINER-functie + pg_cron, zelfde stijl als complete_job().
--
-- Aanname (PRD § 19 A-29): de cron factureert altijd "achteraf" — voor de
-- kalendermaand die zojuist is afgesloten (jobs geteld + evt. overage) —
-- ongeacht `billing_timing`. Een echt vóóraf-gefactureerde stroom kan geen
-- overage van een nog niet uitgevoerde periode kennen; `billing_timing`
-- blijft op de prijsafspraak staan voor toekomstig gebruik (bv. een aparte
-- vooraankondiging) maar verandert dit sprint nog niet wat/wanneer deze cron
-- genereert. Alleen `billing_period = 'monthly'` wordt opgepakt (FR-066 AC2
-- vereist uitsluitend kalendermaand-facturatie); weekly/quarterly-subscripties
-- zijn een bewuste, latere uitbreiding.

create or replace function public.complete_job(p_job_id uuid, p_notes text default null)
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

  -- FR-066: abonnement wordt maandelijks gefactureerd door
  -- generate_subscription_invoices() hieronder, niet per beurt — geen
  -- conceptfactuur hier, anders dubbele facturatie.
  if v_pricing.type = 'subscription' then
    return jsonb_build_object('job', to_jsonb(v_job), 'invoice', null);
  end if;

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

-- Idempotentie-bewaking: voorkomt dubbele abonnementsfacturen als de cron
-- opnieuw draait (bv. na een storing) voor dezelfde dienstafspraak/periode.
create table public.subscription_invoice_periods (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  service_agreement_id uuid not null references public.service_agreements (id) on delete restrict,
  period_start date not null,
  period_end date not null,
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (service_agreement_id, period_start)
);

comment on table public.subscription_invoice_periods is
  'FR-066: welke maand van welke abonnements-dienstafspraak al gefactureerd is — voorkomt dubbele facturatie bij een herstart van de cron.';

alter table public.subscription_invoice_periods enable row level security;

grant select on public.subscription_invoice_periods to authenticated;

create policy "owners, admins, planners and administration can read subscription invoice periods"
  on public.subscription_invoice_periods for select
  to authenticated
  using (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner', 'administration')
  );

-- Geen INSERT/UPDATE-policy: uitsluitend geschreven door
-- generate_subscription_invoices() hieronder (SECURITY DEFINER).

create function public.generate_subscription_invoices()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_start date := date_trunc('month', current_date - interval '1 month')::date;
  v_period_end date := (date_trunc('month', current_date) - interval '1 day')::date;
  v_agreement record;
  v_completed_jobs integer;
  v_overage_jobs integer;
  v_base_vat_cents integer;
  v_overage_vat_cents integer;
  v_base_total_cents integer;
  v_overage_total_cents integer;
  v_invoice public.invoices;
  v_sequence integer;
  v_created_count integer := 0;
begin
  for v_agreement in
    select
      sa.id as service_agreement_id,
      sa.company_id,
      sa.object_id,
      o.customer_id,
      o.address_line1,
      o.city,
      p.amount_cents,
      p.included_jobs_per_period,
      p.overage_amount_cents,
      p.vat_rate,
      s.name as service_name
    from public.service_agreements sa
    join public.pricings p on p.id = sa.pricing_id
    join public.objects o on o.id = sa.object_id
    join public.services s on s.id = sa.service_id
    where sa.status = 'active'
      and p.type = 'subscription'
      and p.billing_period = 'monthly'
      and p.amount_cents is not null
      and p.overage_amount_cents is not null
      and not exists (
        select 1 from public.subscription_invoice_periods sip
        where sip.service_agreement_id = sa.id and sip.period_start = v_period_start
      )
  loop
    select count(*) into v_completed_jobs
    from public.jobs
    where service_agreement_id = v_agreement.service_agreement_id
      and status = 'completed'
      and completed_at::date between v_period_start and v_period_end;

    v_overage_jobs := case
      when v_agreement.included_jobs_per_period = 0 then 0
      else greatest(0, v_completed_jobs - v_agreement.included_jobs_per_period)
    end;

    v_base_vat_cents := round(v_agreement.amount_cents * v_agreement.vat_rate / 100.0);
    v_base_total_cents := v_agreement.amount_cents + v_base_vat_cents;
    v_overage_total_cents := v_overage_jobs * v_agreement.overage_amount_cents;
    v_overage_vat_cents := round(v_overage_total_cents * v_agreement.vat_rate / 100.0);
    v_overage_total_cents := v_overage_total_cents + v_overage_vat_cents;

    insert into public.invoices (
      company_id, customer_id, status, invoice_date, due_date, total_amount_cents, total_tax_cents
    )
    select
      v_agreement.company_id,
      v_agreement.customer_id,
      'draft',
      current_date,
      current_date + c.payment_terms_days,
      v_base_total_cents + v_overage_total_cents,
      v_base_vat_cents + v_overage_vat_cents
    from public.customers c
    where c.id = v_agreement.customer_id
    returning * into v_invoice;

    v_sequence := 1;

    insert into public.invoice_lines (
      company_id, invoice_id, description,
      quantity, unit_price_cents, vat_rate, vat_amount_cents, total_amount_cents, sequence
    ) values (
      v_agreement.company_id, v_invoice.id,
      v_agreement.service_name || ' — abonnement ' || v_agreement.address_line1 || ', ' || v_agreement.city
        || ' (' || to_char(v_period_start, 'MM-YYYY') || ')',
      1.0, v_agreement.amount_cents, v_agreement.vat_rate, v_base_vat_cents, v_base_total_cents, v_sequence
    );

    if v_overage_jobs > 0 then
      v_sequence := v_sequence + 1;
      insert into public.invoice_lines (
        company_id, invoice_id, description,
        quantity, unit_price_cents, vat_rate, vat_amount_cents, total_amount_cents, sequence
      ) values (
        v_agreement.company_id, v_invoice.id,
        'Overage: ' || v_overage_jobs || ' beurt(en) boven abonnement',
        v_overage_jobs, v_agreement.overage_amount_cents, v_agreement.vat_rate,
        v_overage_vat_cents, v_overage_total_cents, v_sequence
      );
    end if;

    insert into public.subscription_invoice_periods (
      company_id, service_agreement_id, period_start, period_end, invoice_id
    ) values (
      v_agreement.company_id, v_agreement.service_agreement_id, v_period_start, v_period_end, v_invoice.id
    );

    v_created_count := v_created_count + 1;
  end loop;

  return v_created_count;
end;
$$;

comment on function public.generate_subscription_invoices() is
  'FR-066/BR-304: maakt per actieve maandelijkse abonnements-dienstafspraak één conceptfactuur (basis + evt. overage) voor de zojuist afgesloten kalendermaand. Gepland via pg_cron, blijft draft — versturen is en blijft een menselijke actie (BR-702).';

select cron.schedule(
  'subscription-billing-monthly',
  '0 2 1 * *',
  $$select public.generate_subscription_invoices();$$
);
