'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { MutableRefObject } from 'react';

const HIGHLIGHT_DURATION_MS = 600;

/**
 * useRealtimeRoute — 41_CodingStandards.md § 6/§ 3 (voorbeeldnaam voor het
 * geïsoleerde realtime-hook-patroon), 42_DesignSystem.md § 15. Abonneert op
 * `jobs`-wijzigingen binnen de eigen `company_id` voor één planningsdag
 * (nooit een ongefilterd kanaal, 41 § 8) en ververst de route-segment-data
 * (`router.refresh()`) zodat wijzigingen van een collega live doorkomen.
 *
 * `suppressUntilRef` (optioneel, gezet door de aanroeper vlak vóór een eigen
 * mutatie) onderdrukt de highlight-puls en de extra refresh voor events die
 * binnenkomen terwijl de eigen Server Action nog bezig is — zonder dit zou de
 * planner de "door een collega gewijzigd"-puls (§ 15) op zijn eigen
 * drag-and-drop/optimalisatie zien, en een dubbele refresh bovenop de
 * `revalidatePath` die de Server Action zelf al triggert.
 */
export function useRealtimeRoute(
  companyId: string,
  date: string,
  suppressUntilRef?: MutableRefObject<number>,
) {
  const router = useRouter();
  const [highlightedJobIds, setHighlightedJobIds] = useState<Set<string>>(new Set());
  const fallbackSuppressRef = useRef(0);
  const suppressRef = suppressUntilRef ?? fallbackSuppressRef;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`planning-jobs-${companyId}-${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: `company_id=eq.${companyId}`,
        },
        (payload: RealtimePostgresChangesPayload<{ id: string; scheduled_date: string }>) => {
          if (Date.now() < suppressRef.current) return;

          const row = payload.new as Partial<{ id: string; scheduled_date: string }>;
          const oldRow = payload.old as Partial<{ id: string; scheduled_date: string }>;
          const jobId = row.id ?? oldRow.id;
          const scheduledDate = row.scheduled_date ?? oldRow.scheduled_date;
          if (!jobId || scheduledDate !== date) return;
          setHighlightedJobIds((prev) => new Set(prev).add(jobId));
          setTimeout(() => {
            setHighlightedJobIds((prev) => {
              const next = new Set(prev);
              next.delete(jobId);
              return next;
            });
          }, HIGHLIGHT_DURATION_MS);

          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, date, router, suppressRef]);

  return { highlightedJobIds };
}
