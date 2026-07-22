'use client';

import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/primitives/button';
import { Checkbox } from '@/components/primitives/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/primitives/dialog';
import { Label } from '@/components/primitives/label';
import type { ActionResult } from '@/lib/errors';

export interface FillDayCandidate {
  jobId: string;
  customerName: string;
  addressLine: string;
  serviceName: string;
  originalDate: string;
  estimatedDurationMinutes: number;
}

export type GetFillDayCandidatesAction = (params: { date: string }) => Promise<FillDayCandidate[]>;

export type FillDayAction = (params: {
  employeeId: string;
  date: string;
  jobIds: string[];
}) => Promise<ActionResult<{ movedCount: number; skippedCount: number; unplaceableCount: number }>>;

interface FillDayDialogProps {
  employeeId: string;
  employeeName: string;
  date: string;
  dayLabel: string;
  getCandidatesAction: GetFillDayCandidatesAction;
  fillDayAction: FillDayAction;
}

/**
 * FillDayDialog — FR-030: spiegelbeeld van ReportSickButton (RouteBoard.tsx/
 * WeekBoard.tsx). Kandidaten worden pas opgehaald bij openen (niet vooraf op
 * de pagina geladen — kan per dag/medewerker verschillen en is duur genoeg
 * om niet ongevraagd voor elke kolom tegelijk te doen).
 */
export function FillDayDialog({
  employeeId,
  employeeName,
  date,
  dayLabel,
  getCandidatesAction,
  fillDayAction,
}: FillDayDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [candidates, setCandidates] = useState<FillDayCandidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setIsLoading(true);
    getCandidatesAction({ date })
      .then((result) => {
        setCandidates(result);
        setSelected(new Set(result.map((c) => c.jobId)));
      })
      .finally(() => setIsLoading(false));
  }

  function toggle(jobId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  async function handleSubmit() {
    if (selected.size === 0) return;
    setIsSubmitting(true);
    const result = await fillDayAction({ employeeId, date, jobIds: Array.from(selected) });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    const { movedCount, unplaceableCount } = result.data;
    if (unplaceableCount > 0) {
      toast.warning(
        `${movedCount} beurt(en) verplaatst naar ${dayLabel}, waarvan ${unplaceableCount} niet plaatsbaar (dag te vol).`,
      );
    } else {
      toast.success(`${movedCount} beurt(en) verplaatst naar ${dayLabel}.`);
    }
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Dag vullen voor ${employeeName} op ${dayLabel}`}
        >
          <CalendarPlus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Vul {dayLabel} voor {employeeName}
          </DialogTitle>
          <DialogDescription>
            Kies welke later-geplande, nog niet-toegewezen beurten naar voren mogen — alleen beurten
            binnen hun eigen flexibiliteitsvenster worden getoond (BR-101). De dag wordt vastgelegd
            als bewust gewerkt.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-text-muted py-6 text-center text-sm">Kandidaten laden…</p>
        ) : candidates.length === 0 ? (
          <p className="text-text-muted py-6 text-center text-sm">
            Geen flexibele beurten binnen bereik om te verplaatsen.
          </p>
        ) : (
          <div className="divide-border max-h-80 divide-y overflow-y-auto">
            {candidates.map((candidate) => (
              <Label
                key={candidate.jobId}
                className="flex items-start gap-3 px-1 py-2 text-sm font-normal"
              >
                <Checkbox
                  checked={selected.has(candidate.jobId)}
                  onCheckedChange={() => toggle(candidate.jobId)}
                  className="mt-0.5"
                />
                <span className="flex-1">
                  <span className="text-text block font-medium">{candidate.customerName}</span>
                  <span className="text-text-muted block">
                    {candidate.serviceName} — {candidate.addressLine}
                  </span>
                  <span className="text-text-muted block text-xs">
                    Oorspronkelijk gepland: {candidate.originalDate}
                  </span>
                </span>
              </Label>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selected.size === 0}>
            {isSubmitting ? 'Bezig…' : `${selected.size} beurt(en) verplaatsen`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
