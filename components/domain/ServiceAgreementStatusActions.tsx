'use client';

import { useRouter } from 'next/navigation';
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
import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import type { ActionResult } from '@/lib/errors';

interface ServiceAgreementStatusActionsProps {
  status: 'active' | 'paused' | 'ended';
  onPause: (input: { pausedUntil: string }) => Promise<ActionResult<null>>;
  onResume: () => Promise<ActionResult<null>>;
  onEnd: () => Promise<ActionResult<null>>;
}

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** FR-005: pauzeren/hervatten/beëindigen. "ended" is terminaal (geen acties meer). */
export function ServiceAgreementStatusActions({
  status,
  onPause,
  onResume,
  onEnd,
}: ServiceAgreementStatusActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pauseOpen, setPauseOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [pausedUntil, setPausedUntil] = useState(tomorrow());

  function runAction(action: () => Promise<ActionResult<null>>, onClose?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Dienstafspraak bijgewerkt');
      onClose?.();
      router.refresh();
    });
  }

  if (status === 'ended') {
    return null;
  }

  return (
    <div className="flex gap-2">
      {status === 'active' ? (
        <Dialog open={pauseOpen} onOpenChange={setPauseOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Pauzeren</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dienstafspraak pauzeren</DialogTitle>
              <DialogDescription>Tot en met welke datum? (BR-030)</DialogDescription>
            </DialogHeader>
            <Label htmlFor="paused-until">Tot en met</Label>
            <Input
              id="paused-until"
              type="date"
              value={pausedUntil}
              onChange={(e) => setPausedUntil(e.target.value)}
            />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPauseOpen(false)} disabled={isPending}>
                Annuleren
              </Button>
              <Button
                onClick={() =>
                  runAction(
                    () => onPause({ pausedUntil }),
                    () => setPauseOpen(false),
                  )
                }
                disabled={isPending}
              >
                {isPending ? 'Bezig…' : 'Pauzeren'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <Button variant="outline" onClick={() => runAction(onResume)} disabled={isPending}>
          {isPending ? 'Bezig…' : 'Hervatten'}
        </Button>
      )}

      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive">Beëindigen</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dienstafspraak beëindigen?</DialogTitle>
            <DialogDescription>
              Dit kan niet ongedaan worden gemaakt — een beëindigde dienstafspraak kan niet meer
              geactiveerd worden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEndOpen(false)} disabled={isPending}>
              Annuleren
            </Button>
            <Button
              variant="destructive"
              onClick={() => runAction(onEnd, () => setEndOpen(false))}
              disabled={isPending}
            >
              {isPending ? 'Bezig…' : 'Beëindigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
