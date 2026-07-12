-- 018_job_photos.sql
-- Sprint 5 — foto's per beurt (11_DatabaseConcept.md § 3.9, FR-044).
-- Storage-pad: job_photos/{company_id}/{job_id}/{uuid}.{ext} (§ 3.9).

create type public.job_photo_type as enum ('before', 'after');

create table public.job_photos (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies (id) on delete restrict,
  job_id uuid not null references public.jobs (id) on delete cascade,
  storage_path varchar(500) not null,
  type public.job_photo_type not null,
  taken_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint job_photos_storage_path_unique unique (storage_path)
);

comment on table public.job_photos is 'Foto per beurt (voor/na) — 11_DatabaseConcept.md § 3.9, FR-044.';

create index idx_job_photos_company_job on public.job_photos (company_id, job_id);

alter table public.job_photos enable row level security;

-- Geen UPDATE/DELETE: een foto wordt niet gecorrigeerd, alleen toegevoegd —
-- analoog aan het geen-hard-delete-patroon elders (jobs/routes).
grant select, insert on public.job_photos to authenticated;

create policy "members can read own company job photos"
  on public.job_photos for select
  to authenticated
  using (company_id = public.current_company_id());

create policy "planning roles can add job photos"
  on public.job_photos for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and public.current_user_role() in ('owner', 'admin', 'planner', 'administration')
  );

create policy "employees can add photos to own route jobs"
  on public.job_photos for insert
  to authenticated
  with check (
    company_id = public.current_company_id()
    and job_id in (
      select j.id
      from public.jobs j
      join public.routes r on r.id = j.route_id
      join public.employees e on e.id = r.employee_id
      where e.user_id = auth.uid()
    )
  );

-- Storage-bucket (niet publiek — alleen via RLS-gated download-URL's).
insert into storage.buckets (id, name, public)
values ('job_photos', 'job_photos', false);

create policy "members can read own company job photo objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'job_photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
  );

create policy "planning roles can upload job photo objects"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'job_photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and public.current_user_role() in ('owner', 'admin', 'planner', 'administration')
  );

create policy "employees can upload own route job photo objects"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'job_photos'
    and (storage.foldername(name))[1] = public.current_company_id()::text
    and (storage.foldername(name))[2] in (
      select j.id::text
      from public.jobs j
      join public.routes r on r.id = j.route_id
      join public.employees e on e.id = r.employee_id
      where e.user_id = auth.uid()
    )
  );
