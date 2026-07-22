'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { PhotoCapture } from '@/components/domain/PhotoCapture';
import { Button } from '@/components/primitives/button';
import { Textarea } from '@/components/primitives/textarea';
import { buildMapsUrl, isIOSDevice } from '@/lib/execution/navigate';
import { enqueueMutation } from '@/lib/pwa/offline-queue';
import type { Database } from '@/types/database.types';

import {
  completeJob,
  markJobNotHome,
  pauseJob,
  recordJobPhoto,
  resumeJob,
  startJob,
} from '../../actions';

type JobStatus = Database['public']['Enums']['job_status'];

interface JobExecutionPanelProps {
  jobId: string;
  companyId: string;
  status: JobStatus;
  startedAt: string | null;
  pausedAt: string | null;
  notes: string | null;
  address: string;
  photos: { id: string; type: 'before' | 'after' }[];
}

const NOT_HOME_REASONS = [
  { value: 'Geen gehoor', label: 'Geen gehoor' },
  { value: 'Gesloten', label: 'Gesloten' },
  { value: 'Uitgesteld', label: 'Uitgesteld' },
];

/** Duimzone-acties + CompleteJobSheet + niet-thuis-flow (29_MobieleApp.md § 2.2-2.4). */
export function JobExecutionPanel({
  jobId,
  companyId,
  status,
  startedAt,
  pausedAt,
  notes,
  address,
  photos,
}: JobExecutionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showComplete, setShowComplete] = useState(false);
  const [showNotHome, setShowNotHome] = useState(false);
  const [completionNotes, setCompletionNotes] = useState(notes ?? '');
  const [photoCount, setPhotoCount] = useState(photos.length);
  const [elapsedLabel, setElapsedLabel] = useState('');

  useEffect(() => {
    if (status !== 'en_route' || !startedAt || pausedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => {
      const minutes = Math.max(0, Math.round((Date.now() - start) / 60000));
      setElapsedLabel(`${minutes} min bezig`);
    };
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [status, startedAt, pausedAt]);

  function handleNavigate() {
    window.open(buildMapsUrl(address, isIOSDevice()), '_blank', 'noopener,noreferrer');
  }

  async function runOrQueue(
    type: 'start' | 'pause' | 'resume' | 'complete' | 'notHome',
    action: () => Promise<{ success: boolean; data?: unknown; error?: { message: string } }>,
    extra?: { notes?: string; reason?: string },
  ) {
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.success) {
          toast.error(result.error?.message ?? 'Actie mislukt.');
          return;
        }
        toast.success('Bijgewerkt.');
        if (type === 'complete') {
          const invoiceSent = (result.data as { invoiceSent?: boolean } | undefined)?.invoiceSent;
          toast.success(
            invoiceSent
              ? 'Top werk! Factuur is verstuurd.'
              : 'Top werk! Conceptfactuur aangemaakt.',
          );
          router.push('/m');
          return;
        }
        if (type === 'notHome') {
          router.push('/m');
          return;
        }
        router.refresh();
      } catch {
        await enqueueMutation({ type, jobId, ...extra } as never);
        toast.info('Offline opgeslagen — synchroniseert zodra je weer verbinding hebt.');
        if (type === 'complete' || type === 'notHome') {
          router.push('/m');
        }
      }
    });
  }

  return (
    <div>
      {status === 'en_route' && elapsedLabel && (
        <p className="text-info mt-4 text-sm font-medium">{elapsedLabel}</p>
      )}

      {(status === 'planned' || status === 'en_route') && (
        <div className="mt-6 space-y-3">
          {photos.length > 0 || status === 'en_route' ? (
            <PhotoCapture
              jobId={jobId}
              companyId={companyId}
              type="before"
              label="Foto vóór"
              onUploaded={async (path) => {
                await recordJobPhoto({ jobId, storagePath: path, type: 'before' });
                setPhotoCount((n) => n + 1);
              }}
            />
          ) : null}
        </div>
      )}

      <div className="border-border bg-bg fixed inset-x-0 bottom-0 mx-auto max-w-md space-y-2 border-t p-4 md:max-w-2xl">
        <Button className="w-full justify-center" variant="outline" onClick={handleNavigate}>
          Navigeren
        </Button>

        {status === 'planned' && (
          <Button
            className="w-full justify-center"
            disabled={isPending}
            onClick={() => runOrQueue('start', () => startJob(jobId))}
          >
            Start
          </Button>
        )}

        {status === 'en_route' && !pausedAt && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 justify-center"
              disabled={isPending}
              onClick={() => runOrQueue('pause', () => pauseJob(jobId))}
            >
              Pauzeren
            </Button>
            <Button
              className="flex-1 justify-center"
              disabled={isPending}
              onClick={() => setShowComplete(true)}
            >
              Gereed
            </Button>
          </div>
        )}

        {status === 'en_route' && pausedAt && (
          <Button
            className="w-full justify-center"
            disabled={isPending}
            onClick={() => runOrQueue('resume', () => resumeJob(jobId))}
          >
            Hervatten
          </Button>
        )}

        {(status === 'planned' || status === 'en_route') && (
          <Button
            variant="ghost"
            className="w-full justify-center"
            onClick={() => setShowNotHome(true)}
          >
            Niet thuis
          </Button>
        )}
      </div>

      {showComplete && (
        <div
          className="fixed inset-0 z-10 flex flex-col justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-bg rounded-t-lg p-4">
            <h2 className="text-text text-base font-semibold">Beurt afronden</h2>
            <PhotoCapture
              jobId={jobId}
              companyId={companyId}
              type="after"
              label="Foto na"
              onUploaded={async (path) => {
                await recordJobPhoto({ jobId, storagePath: path, type: 'after' });
                setPhotoCount((n) => n + 1);
              }}
            />
            <p className="text-text-muted mt-1 text-xs">{photoCount} foto(s) toegevoegd</p>
            <Textarea
              className="mt-3"
              placeholder="Notitie (optioneel)"
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 justify-center"
                onClick={() => setShowComplete(false)}
              >
                Annuleren
              </Button>
              <Button
                className="flex-1 justify-center"
                disabled={isPending}
                onClick={() =>
                  runOrQueue('complete', () => completeJob(jobId, completionNotes || undefined), {
                    notes: completionNotes || undefined,
                  })
                }
              >
                Gereed ✓
              </Button>
            </div>
          </div>
        </div>
      )}

      {showNotHome && (
        <div
          className="fixed inset-0 z-10 flex flex-col justify-end bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-bg rounded-t-lg p-4">
            <h2 className="text-text text-base font-semibold">Niet thuis</h2>
            <div className="mt-3 space-y-2">
              {NOT_HOME_REASONS.map((reason) => (
                <Button
                  key={reason.value}
                  variant="outline"
                  className="w-full justify-center"
                  disabled={isPending}
                  onClick={() =>
                    runOrQueue('notHome', () => markJobNotHome(jobId, reason.value), {
                      reason: reason.value,
                    })
                  }
                >
                  {reason.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                className="w-full justify-center"
                onClick={() => setShowNotHome(false)}
              >
                Annuleren
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
