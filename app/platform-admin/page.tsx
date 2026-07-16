import { PageHeader } from '@/components/composed/PageHeader';
import { FeatureRequestsInbox } from '@/components/domain/platform-admin/FeatureRequestsInbox';
import { OperationalOverview } from '@/components/domain/platform-admin/OperationalOverview';
import { PlatformProposalForm } from '@/components/domain/platform-admin/PlatformProposalForm';
import { ProposalCard } from '@/components/domain/platform-admin/ProposalCard';
import { requirePlatformAdmin } from '@/lib/platform-admin/guard';
import {
  getAgentHealthOverview,
  getFeatureRequestsForPortal,
  getPlatformProposals,
} from '@/lib/platform-admin/queries';
import { createClient } from '@/lib/supabase/server';

import {
  acceptFeatureRequest,
  createPlatformProposal,
  decidePlatformProposal,
  markPlatformProposalMerged,
  rejectFeatureRequest,
} from './actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Admin — RouteFlow',
};

/**
 * Platform Admin-portal (FR-952/953, 46_PlatformAdmin.md § 1.3) —
 * cross-tenant operationeel overzicht, feature-request-inbox en Product
 * Agent-voorstellen met uitsluitend handmatige goedkeuring (BR-901).
 */
export default async function PlatformAdminPage() {
  await requirePlatformAdmin();
  const supabase = await createClient();

  const [companies, proposals, featureRequests] = await Promise.all([
    getAgentHealthOverview(supabase),
    getPlatformProposals(supabase),
    getFeatureRequestsForPortal(supabase),
  ]);

  return (
    <div className="max-w-4xl space-y-10">
      <PageHeader
        title="Platform Admin"
        description="Cross-tenant overzicht, feature requests en Product Agent-voorstellen."
      />

      <section>
        <h2 className="text-text mb-3 text-lg font-semibold">Operationeel overzicht (7 dagen)</h2>
        <OperationalOverview companies={companies} />
      </section>

      <section>
        <h2 className="text-text mb-3 text-lg font-semibold">Feature requests</h2>
        <FeatureRequestsInbox
          requests={featureRequests}
          onAccept={acceptFeatureRequest}
          onReject={rejectFeatureRequest}
        />
      </section>

      <section>
        <h2 className="text-text mb-3 text-lg font-semibold">Product Agent-voorstellen</h2>
        {proposals.length === 0 ? (
          <p className="text-text-muted text-sm">Nog geen voorstellen.</p>
        ) : (
          <div className="space-y-3">
            {proposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onDecide={decidePlatformProposal}
                onMarkMerged={markPlatformProposalMerged}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-text mb-3 text-lg font-semibold">
          Nieuw voorstel (handmatig, fundament)
        </h2>
        <p className="text-text-muted mb-3 text-sm">
          Tot de geplande Product Agent-run (Sprint 11-vervolg) is dit het enige aanmaakpad.
        </p>
        <PlatformProposalForm onSubmit={createPlatformProposal} />
      </section>
    </div>
  );
}
