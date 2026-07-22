import Link from 'next/link';
import { notFound } from 'next/navigation';

import { StatusBadge } from '@/components/domain/StatusBadge';
import { requireOnboardedUser } from '@/lib/auth/session';
import { JOB_STATUS_LABEL, JOB_STATUS_TONE } from '@/lib/labels';
import { createClient } from '@/lib/supabase/server';

import { JobExecutionPanel } from './JobExecutionPanel';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Beurt — ServOps' };

/** Beurt-detail /m/beurt/[id] — 29_MobieleApp.md § 2.2. Geen prijzen (23 P1). */
export default async function BeurtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile } = await requireOnboardedUser();
  const supabase = await createClient();

  const { data: job } = await supabase
    .from('jobs')
    .select(
      `id, status, started_at, paused_at, notes,
       service_agreements!jobs_service_agreement_id_fkey(
         services!service_agreements_service_id_fkey(name, standard_duration_minutes),
         objects!service_agreements_object_id_fkey(address_line1, city, access_notes, customers!objects_customer_id_fkey(name))
       )`,
    )
    .eq('id', id)
    .maybeSingle();

  if (!job) {
    notFound();
  }

  const { data: photos } = await supabase
    .from('job_photos')
    .select('id, type, storage_path')
    .eq('job_id', id)
    .order('taken_at');

  const agreement = job.service_agreements as {
    services: { name: string; standard_duration_minutes: number } | null;
    objects: {
      address_line1: string;
      city: string;
      access_notes: string | null;
      customers: { name: string } | null;
    } | null;
  } | null;
  const object = agreement?.objects ?? null;
  const address = object ? `${object.address_line1}, ${object.city}` : '';

  return (
    <div className="px-4 py-4">
      <StatusBadge label={JOB_STATUS_LABEL[job.status]} tone={JOB_STATUS_TONE[job.status]} />
      <h1 className="text-text mt-2 text-lg font-semibold">
        {object?.customers?.name ?? 'Onbekende klant'}
      </h1>
      <p className="text-text-muted text-sm">{address}</p>
      <p className="text-text mt-2 text-sm font-medium">{agreement?.services?.name ?? 'Dienst'}</p>
      <p className="text-text-muted text-xs">
        Verwachte duur: {agreement?.services?.standard_duration_minutes ?? '—'} min
      </p>
      {object?.access_notes && (
        <p className="bg-surface text-text mt-3 rounded-md p-3 text-sm">{object.access_notes}</p>
      )}

      {(job.status === 'completed' || job.status === 'invoiced') && (
        <Link
          href={`/m/beurt/${job.id}/werkbon`}
          className="text-primary mt-3 inline-block text-sm underline"
        >
          Werkbon bekijken
        </Link>
      )}

      <JobExecutionPanel
        jobId={job.id}
        companyId={profile.company_id}
        status={job.status}
        startedAt={job.started_at}
        pausedAt={job.paused_at}
        notes={job.notes}
        address={address}
        photos={(photos ?? []).map((p) => ({ id: p.id, type: p.type }))}
      />
    </div>
  );
}
