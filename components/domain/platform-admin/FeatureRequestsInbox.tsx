'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

import { StatusBadge } from '@/components/domain/StatusBadge';
import { Button } from '@/components/primitives/button';
import { EmptyState } from '@/components/primitives/empty-state';
import { FEATURE_REQUEST_STATUS_LABEL, FEATURE_REQUEST_STATUS_TONE } from '@/lib/labels';
import type { FeatureRequestRow } from '@/lib/platform-admin/queries';

interface FeatureRequestsInboxProps {
  requests: Array<FeatureRequestRow & { companies: { name: string } | null }>;
  onAccept: (
    featureRequestId: string,
  ) => Promise<{ success: true } | { success: false; error: { message: string } }>;
  onReject: (
    featureRequestId: string,
  ) => Promise<{ success: true } | { success: false; error: { message: string } }>;
}

/**
 * FeatureRequestsInbox — 46_PlatformAdmin.md § 1.3/§ 2, FR-952. Platformbreed
 * overzicht (BR-904: de tenants zelf zien elkaars requests nooit, dit is
 * uitsluitend het platform-admin-portal). Clustering/triage naar een concreet
 * voorstel is Sprint 11-vervolg (FR-951); dit fundament biedt alleen
 * afwijzen als directe actie.
 */
export function FeatureRequestsInbox({ requests, onAccept, onReject }: FeatureRequestsInboxProps) {
  const [isPending, startTransition] = useTransition();

  function handleAccept(id: string) {
    startTransition(async () => {
      const result = await onAccept(id);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Feature request geaccepteerd');
    });
  }

  function handleReject(id: string) {
    startTransition(async () => {
      const result = await onReject(id);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Feature request afgewezen');
    });
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        title="Nog geen feature requests binnengekomen."
        description="Zodra een bedrijf iets indient, verschijnt het hier."
      />
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div key={request.id} className="border-border bg-bg rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-text text-sm font-semibold">{request.title}</p>
              <p className="text-text-muted text-xs">
                {request.companies?.name ?? 'Onbekend bedrijf'}
              </p>
            </div>
            <StatusBadge
              label={FEATURE_REQUEST_STATUS_LABEL[request.status]}
              tone={FEATURE_REQUEST_STATUS_TONE[request.status]}
            />
          </div>
          <p className="text-text-muted mt-2 text-sm whitespace-pre-wrap">{request.description}</p>
          {request.status === 'nieuw' ? (
            <div className="mt-3 flex gap-2">
              <Button size="sm" disabled={isPending} onClick={() => handleAccept(request.id)}>
                Accepteren
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => handleReject(request.id)}
              >
                Afwijzen
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
