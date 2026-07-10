import { notFound } from 'next/navigation';

import { ArchiveConfirmButton } from '@/components/composed/ArchiveConfirmButton';
import { PageHeader } from '@/components/composed/PageHeader';
import { ServiceForm } from '@/components/domain/ServiceForm';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import { archiveService, updateService } from '../../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dienst bewerken — RouteFlow',
};

export default async function DienstBewerkenPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOnboardedUser();
  const { id } = await params;
  const supabase = await createClient();
  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .is('archived_at', null)
    .maybeSingle();

  if (!service) {
    notFound();
  }

  return (
    <div>
      <PageHeader
        title={`${service.name} bewerken`}
        action={
          <ArchiveConfirmButton
            triggerLabel="Archiveren"
            title="Dienst archiveren?"
            description={`"${service.name}" wordt gearchiveerd en verdwijnt uit het dienstenaanbod.`}
            action={archiveService.bind(null, service.id)}
          />
        }
      />
      <ServiceForm
        submitLabel="Wijzigingen opslaan"
        defaultValues={{
          name: service.name,
          description: service.description ?? undefined,
          standardDurationMinutes: service.standard_duration_minutes,
          standardPriceEuros: service.standard_price_cents / 100,
          vatRate: Number(service.vat_rate),
          isWeatherSensitive: service.is_weather_sensitive,
          weatherSensitivityType: service.weather_sensitivity_type ?? undefined,
          icon: service.icon ?? undefined,
          colorHex: service.color_hex ?? undefined,
        }}
        onSubmit={updateService.bind(null, service.id)}
        redirectTo="/instellingen/diensten"
      />
    </div>
  );
}
