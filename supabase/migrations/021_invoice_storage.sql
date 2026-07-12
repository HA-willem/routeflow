-- 021_invoice_storage.sql
-- Sprint 5 — opslag voor gegenereerde factuur-PDF's (16_Facturatie.md § 5).
-- Pad: invoices/{company_id}/{invoice_id}.pdf. Rechten volgen de Facturen-rij
-- in 23_Gebruikersrollen.md § 2 (Eigenaar/Planner alleen R; Admin/Administratie
-- ook schrijven, want zij zijn de enigen die mogen verzenden).

insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false);

create policy "members can read own company invoice pdfs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() in ('owner', 'admin', 'planner', 'administration')
  );

create policy "admin and administration can upload invoice pdfs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() in ('admin', 'administration')
  );

create policy "admin and administration can replace invoice pdfs"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() in ('admin', 'administration')
  )
  with check (
    bucket_id = 'invoices'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() in ('admin', 'administration')
  );
