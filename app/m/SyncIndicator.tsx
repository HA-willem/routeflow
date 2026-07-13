'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import { flushQueue, listQueuedMutations, type QueuedMutation } from '@/lib/pwa/offline-queue';

import { completeJob, markJobNotHome, pauseJob, resumeJob, startJob } from './actions';

/**
 * Sync-indicator (29_MobieleApp.md § 2.1 kop, 20_PWA.md § 3.2): "Online" ·
 * "Offline" · "Synchroniseert n/m…". Verwerkt de retry-queue automatisch
 * zodra de verbinding terugkomt.
 */
export function SyncIndicator() {
  // useSyncExternalStore met een server-snapshot van `true`: de server rendert
  // "Online" en de client leest navigator.onLine pas ná hydration — voorkomt
  // een hydration-mismatch wanneer de client bij eerste render offline rapporteert.
  const isOnline = useSyncExternalStore(
    subscribeToOnlineStatus,
    () => navigator.onLine,
    () => true,
  );
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    listQueuedMutations().then((queued) => setPending(queued.length));

    async function handleOnline() {
      setSyncing(true);
      await flushQueue({
        start: async (m: QueuedMutation) =>
          (await startJob((m as { jobId: string }).jobId)).success,
        pause: async (m: QueuedMutation) =>
          (await pauseJob((m as { jobId: string }).jobId)).success,
        resume: async (m: QueuedMutation) =>
          (await resumeJob((m as { jobId: string }).jobId)).success,
        complete: async (m) => {
          const mutation = m as { jobId: string; notes?: string };
          return (await completeJob(mutation.jobId, mutation.notes)).success;
        },
        notHome: async (m) => {
          const mutation = m as { jobId: string; reason?: string };
          return (await markJobNotHome(mutation.jobId, mutation.reason)).success;
        },
      });
      const remaining = await listQueuedMutations();
      setPending(remaining.length);
      setSyncing(false);
    }

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOnline) {
    return (
      <span className="bg-warning/15 text-warning rounded-full px-2.5 py-1 text-xs font-medium">
        Offline
      </span>
    );
  }

  if (syncing || pending > 0) {
    return (
      <span className="bg-info/15 text-info rounded-full px-2.5 py-1 text-xs font-medium">
        Synchroniseert{pending > 0 ? ` ${pending}` : '…'}
      </span>
    );
  }

  return <span className="text-text-muted text-xs">Online</span>;
}

function subscribeToOnlineStatus(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}
