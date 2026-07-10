import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/composed/PageHeader';
import { ServiceAgreementForm } from '@/components/domain/ServiceAgreementForm';
import { ServiceAgreementStatusActions } from '@/components/domain/ServiceAgreementStatusActions';
import { requireOnboardedUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

import {
  endServiceAgreement,
  pauseServiceAgreement,
  resumeServiceAgreement,
  updateServiceAgreement,
} from '../../actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dienstafspraak bewerken — RouteFlow',
};

export default async function DienstafspraakBewerkenPage({
  params,
}: {
  params: Promise<{ id: string; objectId: string; agreementId: string }>;
}) {
  const { profile } = await requireOnboardedUser();
  const { id: customerId, objectId, agreementId } = await params;
  const supabase = await createClient();

  const { data: agreement } = await supabase
    .from('service_agreements')
    .select('*, pricings(*)')
    .eq('id', agreementId)
    .eq('object_id', objectId)
    .maybeSingle();

  if (!agreement || !agreement.pricings) {
    notFound();
  }

  const { data: services } = await supabase
    .from('services')
    .select('id, name')
    .eq('company_id', profile.company_id)
    .is('archived_at', null)
    .order('name', { ascending: true });

  const pricing = agreement.pricings;

  return (
    <div>
      <PageHeader
        title="Dienstafspraak bewerken"
        action={
          <ServiceAgreementStatusActions
            status={agreement.status}
            onPause={(input) => pauseServiceAgreement(customerId, objectId, agreement.id, input)}
            onResume={() => resumeServiceAgreement(customerId, objectId, agreement.id)}
            onEnd={() => endServiceAgreement(customerId, objectId, agreement.id)}
          />
        }
      />
      <ServiceAgreementForm
        services={services ?? []}
        submitLabel="Wijzigingen opslaan"
        defaultValues={{
          serviceId: agreement.service_id,
          frequencyType: agreement.frequency_type,
          customIntervalDays: agreement.frequency_interval_days ?? undefined,
          preferredDay: agreement.preferred_day ?? undefined,
          preferredDaypart: agreement.preferred_daypart ?? undefined,
          flexibilityWindowDays: agreement.flexibility_window_days,
          callAheadRequired: agreement.call_ahead_required,
          pricingType: pricing.type === 'hourly' ? 'hourly' : 'per_job',
          amountEuros: pricing.amount_cents !== null ? pricing.amount_cents / 100 : undefined,
          hourlyRateEuros:
            pricing.hourly_rate_cents !== null ? pricing.hourly_rate_cents / 100 : undefined,
          vatRate: Number(pricing.vat_rate),
        }}
        onSubmit={updateServiceAgreement.bind(null, customerId, objectId, agreement.id, pricing.id)}
        redirectTo={() => `/klanten/${customerId}/objecten/${objectId}`}
      />
    </div>
  );
}
