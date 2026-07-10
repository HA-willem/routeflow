'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/primitives/dialog';
import type { ActionResult } from '@/lib/errors';

interface ArchiveConfirmButtonProps {
  triggerLabel: string;
  title: string;
  description: string;
  action: () => Promise<ActionResult<null>>;
}

/**
 * Archiveren i.p.v. verwijderen (11_DatabaseConcept.md § 5, BR-040/BR-502) —
 * altijd met een bevestigingsdialoog (26_ComponentLibrary.md § 2, "Modal,
 * bevestiging (danger)").
 */
export function ArchiveConfirmButton({
  triggerLabel,
  title,
  description,
  action,
}: ArchiveConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error.message);
        setOpen(false);
        return;
      }
      // Bij succes stuurt de Server Action zelf door (redirect()); deze
      // component hoeft de dialoog dan niet meer te sluiten.
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Annuleren
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? 'Bezig…' : 'Archiveren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
