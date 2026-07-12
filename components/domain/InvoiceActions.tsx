'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/primitives/button';
import type { ActionResult } from '@/lib/errors';

interface InvoiceActionsProps {
  status: 'draft' | 'sent' | 'paid';
  onSend: () => Promise<ActionResult<{ invoiceNumber: string }>>;
  onMarkPaid: () => Promise<ActionResult<null>>;
}

/** Facturen § 16_Facturatie.md — verzenden (nummering+PDF+e-mail) / handmatig betaald markeren (MVP, geen Mollie). */
export function InvoiceActions({ status, onSend, onMarkPaid }: InvoiceActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult<unknown>>, successMessage: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  }

  if (status === 'draft') {
    return (
      <Button size="sm" disabled={isPending} onClick={() => run(onSend, 'Factuur verzonden')}>
        {isPending ? 'Bezig…' : 'Verzenden'}
      </Button>
    );
  }

  if (status === 'sent') {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => run(onMarkPaid, 'Factuur gemarkeerd als betaald')}
      >
        {isPending ? 'Bezig…' : 'Markeer betaald'}
      </Button>
    );
  }

  return null;
}
