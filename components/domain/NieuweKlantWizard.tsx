'use client';

import Link from 'next/link';
import { useState } from 'react';

import { PageHeader } from '@/components/composed/PageHeader';
import { CustomerForm } from '@/components/domain/CustomerForm';
import { ObjectForm } from '@/components/domain/ObjectForm';
import { ServiceAgreementForm } from '@/components/domain/ServiceAgreementForm';
import type { ActionResult } from '@/lib/errors';

interface ServiceOption {
  id: string;
  name: string;
}

type Step = 'klant' | 'object' | 'dienst';

const STEP_LABEL: Record<Step, string> = {
  klant: 'Stap 1 van 3 — Klantgegevens',
  object: 'Stap 2 van 3 — Adres',
  dienst: 'Stap 3 van 3 — Dienst en frequentie',
};

interface NieuweKlantWizardProps {
  services: ServiceOption[];
  createCustomerAction: (input: unknown) => Promise<ActionResult<{ id: string }>>;
  createObjectAction: (customerId: string, input: unknown) => Promise<ActionResult<{ id: string }>>;
  createServiceAgreementAction: (
    customerId: string,
    objectId: string,
    input: unknown,
  ) => Promise<ActionResult<{ id: string }>>;
  createServiceAction: (input: unknown) => Promise<ActionResult<{ id: string }>>;
}

/**
 * NieuweKlantWizard — hergebruikt CustomerForm/ObjectForm/ServiceAgreementForm
 * en hun bestaande Server Actions ongewijzigd (als props doorgegeven door de
 * Server Component-pagina, zelfde patroon als InvoiceActions in
 * app/(app)/facturen/page.tsx); orkestreert alleen de drie stappen op één
 * pagina zodat een klant meteen met een frequentie de planning in kan
 * ("plan automatisch"), i.p.v. via drie losse paginanavigaties.
 * FR-001/003/004/020 (docs/27_PaginaOverzicht.md § 1.4/§1.5).
 */
export function NieuweKlantWizard({
  services,
  createCustomerAction,
  createObjectAction,
  createServiceAgreementAction,
  createServiceAction,
}: NieuweKlantWizardProps) {
  const [step, setStep] = useState<Step>('klant');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [objectId, setObjectId] = useState<string | null>(null);

  return (
    <div>
      <PageHeader title="Nieuwe klant" description={STEP_LABEL[step]} />

      {step === 'klant' ? (
        <CustomerForm
          submitLabel="Volgende: adres toevoegen"
          onSubmit={createCustomerAction}
          redirectTo="/klanten/:id"
          onSuccess={(id) => {
            setCustomerId(id);
            setStep('object');
          }}
        />
      ) : null}

      {step === 'object' && customerId ? (
        <>
          <ObjectForm
            submitLabel="Volgende: dienst en frequentie"
            onSubmit={createObjectAction.bind(null, customerId)}
            redirectTo={`/klanten/${customerId}`}
            onSuccess={(id) => {
              setObjectId(id);
              setStep('dienst');
            }}
          />
          <Link
            href={`/klanten/${customerId}`}
            className="text-text-muted hover:text-text mt-4 inline-block text-sm underline"
          >
            Later toevoegen
          </Link>
        </>
      ) : null}

      {step === 'dienst' && customerId && objectId ? (
        <>
          <ServiceAgreementForm
            services={services}
            createServiceAction={createServiceAction}
            submitLabel="Plan automatisch"
            onSubmit={createServiceAgreementAction.bind(null, customerId, objectId)}
            redirectTo={`/klanten/${customerId}`}
          />
          <Link
            href={`/klanten/${customerId}`}
            className="text-text-muted hover:text-text mt-4 inline-block text-sm underline"
          >
            Later toevoegen
          </Link>
        </>
      ) : null}
    </div>
  );
}
