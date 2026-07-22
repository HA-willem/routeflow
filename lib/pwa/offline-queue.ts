'use client';

/**
 * Retry-queue voor mutaties tijdens uitvoering (20_PWA.md § 3.1: "een beurt
 * afvinken/notitie/foto wordt lokaal opgeslagen (IndexedDB) en in een
 * retry-queue gezet"). IndexedDB i.p.v. localStorage: overleeft app-herstart
 * en kan grotere payloads (foto-blobs) aan (§ 3.3). Alleen client-side
 * geïmporteerd (PWA-schermen, 'use client') — geen SSR-gebruik.
 */

const DB_NAME = 'servops-m-queue';
const STORE_NAME = 'mutations';
const DB_VERSION = 1;

export type QueuedMutation =
  | { id: string; type: 'start'; jobId: string; createdAt: number }
  | { id: string; type: 'pause'; jobId: string; createdAt: number }
  | { id: string; type: 'resume'; jobId: string; createdAt: number }
  | { id: string; type: 'complete'; jobId: string; notes?: string; createdAt: number }
  | { id: string; type: 'notHome'; jobId: string; reason?: string; createdAt: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueMutation(
  mutation: Omit<QueuedMutation, 'id' | 'createdAt'>,
): Promise<void> {
  const db = await openDb();
  const entry: QueuedMutation = {
    ...mutation,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  } as QueuedMutation;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as QueuedMutation[]);
    request.onerror = () => reject(request.error);
  });
}

export async function removeQueuedMutation(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Verwerkt de queue in volgorde, max 3 pogingen per mutatie (20 § 3.1). Stopt
 * bij de eerste mutatie die blijft falen (in-order — een latere "voltooien"
 * mag niet vóór een eerdere "starten" verwerkt worden).
 */
export async function flushQueue(
  handlers: Record<QueuedMutation['type'], (mutation: QueuedMutation) => Promise<boolean>>,
): Promise<{ processed: number; remaining: number }> {
  const queued = await listQueuedMutations();
  queued.sort((a, b) => a.createdAt - b.createdAt);

  let processed = 0;
  for (const mutation of queued) {
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt += 1) {
      ok = await handlers[mutation.type](mutation);
    }
    if (!ok) {
      break;
    }
    await removeQueuedMutation(mutation.id);
    processed += 1;
  }

  const remaining = (await listQueuedMutations()).length;
  return { processed, remaining };
}
