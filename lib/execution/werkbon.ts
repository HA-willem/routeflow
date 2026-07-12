import type { WerkbonData } from '@/components/domain/Werkbon';
import type { createClient } from '@/lib/supabase/server';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/** Gedeelde Werkbon-query — gebruikt door zowel /m/beurt/[id]/werkbon (medewerker) als de desktop-variant. */
export async function getWerkbonData(
  supabase: SupabaseClient,
  jobId: string,
): Promise<WerkbonData | null> {
  const { data: job } = await supabase
    .from('jobs')
    .select(
      `id, status, notes, scheduled_date,
       routes!jobs_route_id_fkey(employees!routes_employee_id_fkey(first_name, last_name)),
       service_agreements!jobs_service_agreement_id_fkey(
         services!service_agreements_service_id_fkey(name),
         objects!service_agreements_object_id_fkey(address_line1, city, customers!objects_customer_id_fkey(name))
       )`,
    )
    .eq('id', jobId)
    .maybeSingle();

  if (!job) {
    return null;
  }

  const { data: photoRows } = await supabase
    .from('job_photos')
    .select('type, storage_path')
    .eq('job_id', jobId)
    .order('taken_at');

  const photoUrls = await Promise.all(
    (photoRows ?? []).map(async (photo) => {
      const { data: signed } = await supabase.storage
        .from('job_photos')
        .createSignedUrl(photo.storage_path, 3600);
      return { type: photo.type, url: signed?.signedUrl ?? '' };
    }),
  );

  const agreement = job.service_agreements as {
    services: { name: string } | null;
    objects: { address_line1: string; city: string; customers: { name: string } | null } | null;
  } | null;
  const object = agreement?.objects ?? null;
  const route = job.routes as {
    employees: { first_name: string; last_name: string } | null;
  } | null;
  const employee = route?.employees ?? null;

  return {
    customerName: object?.customers?.name ?? 'Onbekende klant',
    objectAddress: object ? `${object.address_line1}, ${object.city}` : '—',
    serviceName: agreement?.services?.name ?? 'Dienst',
    employeeName: employee ? `${employee.first_name} ${employee.last_name}` : '—',
    scheduledDate: job.scheduled_date,
    status: job.status,
    notes: job.notes,
    photoUrls: photoUrls.filter((p) => p.url),
  };
}
