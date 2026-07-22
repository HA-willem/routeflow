-- 035_invoice_credit_notes.sql
-- Sprint 9 (FR-068/BR-020) — creditfactuur & correcties met audit trail.
-- Voegt `parent_invoice_id` toe (16_Facturatie.md § 9: "gekoppeld aan
-- origineel") en een SECURITY DEFINER-functie `create_credit_invoice()` die
-- de nieuwe, negatieve factuur + regels aanmaakt — zelfde reden als
-- complete_job()/next_invoice_number(): geen directe INSERT-policy op
-- invoices/invoice_lines, dus een RPC met eigen rolcontrole.
--
-- De bestaande niet-negatieve check-constraints op invoices moeten aangepast
-- worden: een creditfactuur heeft per definitie een negatief (of nul) totaal.
-- invoice_lines had al geen "bedrag >= 0"-constraint (alleen quantity > 0,
-- 019_invoicing_mvp.sql), dus daar is geen wijziging nodig.

alter table public.invoices add column parent_invoice_id uuid references public.invoices (id);

comment on column public.invoices.parent_invoice_id is
  'FR-068: gezet op een creditfactuur, verwijst naar de gecorrigeerde originele factuur. Null voor een gewone factuur.';

create index idx_invoices_parent_invoice_id on public.invoices (parent_invoice_id)
  where parent_invoice_id is not null;

alter table public.invoices drop constraint invoices_total_amount_non_negative;
alter table public.invoices add constraint invoices_total_amount_valid check (
  (parent_invoice_id is null and total_amount_cents >= 0)
  or (parent_invoice_id is not null and total_amount_cents <= 0)
);

alter table public.invoices drop constraint invoices_total_tax_non_negative;
alter table public.invoices add constraint invoices_total_tax_valid check (
  (parent_invoice_id is null and total_tax_cents >= 0)
  or (parent_invoice_id is not null and total_tax_cents <= 0)
);

-- create_credit_invoice() — Admin/Administratie (zelfde rolcontrole als
-- next_invoice_number(), 019_invoicing_mvp.sql). `p_lines` is een jsonb-array
-- van {"description": text, "amount_cents": integer (positief, excl. BTW),
-- "vat_rate": numeric} — de UI laat de planner bestaande factuurregel(en)
-- selecteren en/of een vrije correctieregel invullen; deze functie negeert de
-- bedragen intern (credit = negatief). Maakt de factuur aan als 'draft',
-- exact zoals complete_job()/generate_subscription_invoices() dat doen —
-- verzenden (nummeren/PDF/e-mail) gebeurt via de bestaande sendInvoice()
-- Server Action, geen nieuwe verzendlogica.
create function public.create_credit_invoice(
  p_invoice_id uuid,
  p_lines jsonb,
  p_note text default null
)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original public.invoices;
  v_credit public.invoices;
  v_line jsonb;
  v_sequence integer := 0;
  v_amount_cents integer;
  v_vat_rate numeric(5, 2);
  v_vat_amount_cents integer;
  v_line_total_cents integer;
  v_total_amount_cents integer := 0;
  v_total_tax_cents integer := 0;
begin
  if public.current_user_role() not in ('admin', 'administration') then
    raise exception 'Alleen Admin/Administratie mag een creditfactuur aanmaken.' using errcode = '42501';
  end if;

  select * into v_original from public.invoices
    where id = p_invoice_id and company_id = public.current_company_id();

  if v_original.id is null then
    raise exception 'Factuur niet gevonden.' using errcode = 'P0002';
  end if;

  if v_original.status not in ('sent', 'paid') then
    raise exception 'Alleen een verzonden of betaalde factuur kan gecorrigeerd worden.' using errcode = 'P0001';
  end if;

  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Geef minimaal één regel op om te crediteren.' using errcode = 'P0001';
  end if;

  insert into public.invoices (
    company_id, customer_id, status, invoice_date, due_date,
    total_amount_cents, total_tax_cents, notes, parent_invoice_id
  ) values (
    v_original.company_id, v_original.customer_id, 'draft', current_date, current_date,
    0, 0, p_note, v_original.id
  ) returning * into v_credit;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_sequence := v_sequence + 1;
    v_amount_cents := (v_line ->> 'amount_cents')::integer;
    v_vat_rate := (v_line ->> 'vat_rate')::numeric;

    if v_amount_cents is null or v_amount_cents <= 0 then
      raise exception 'Elk regelbedrag moet positief zijn (wordt intern gecrediteerd).' using errcode = 'P0001';
    end if;

    v_vat_amount_cents := round(v_amount_cents * v_vat_rate / 100.0);
    v_line_total_cents := v_amount_cents + v_vat_amount_cents;

    insert into public.invoice_lines (
      company_id, invoice_id, description,
      quantity, unit_price_cents, vat_rate, vat_amount_cents, total_amount_cents, sequence
    ) values (
      v_original.company_id, v_credit.id, coalesce(v_line ->> 'description', 'Correctie'),
      1.0, -v_amount_cents, v_vat_rate, -v_vat_amount_cents, -v_line_total_cents, v_sequence
    );

    v_total_amount_cents := v_total_amount_cents - v_line_total_cents;
    v_total_tax_cents := v_total_tax_cents - v_vat_amount_cents;
  end loop;

  update public.invoices
    set total_amount_cents = v_total_amount_cents, total_tax_cents = v_total_tax_cents
    where id = v_credit.id
    returning * into v_credit;

  return v_credit;
end;
$$;

revoke all on function public.create_credit_invoice(uuid, jsonb, text) from public;
grant execute on function public.create_credit_invoice(uuid, jsonb, text) to authenticated;
