'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
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
import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives/select';
import { Textarea } from '@/components/primitives/textarea';
import type { ActionResult } from '@/lib/errors';
import { formatCents } from '@/lib/invoicing/money';

export interface CreditableLine {
  id: string;
  description: string;
  /** Excl.-BTW-bedrag (unit_price_cents × quantity) — wat create_credit_invoice() als amount_cents verwacht. */
  exclVatAmountCents: number;
  vatRate: number;
  totalAmountCents: number;
}

interface CreditInvoiceDialogProps {
  lines: CreditableLine[];
  onSubmit: (input: unknown) => Promise<ActionResult<{ id: string }>>;
}

/**
 * FR-068: "Correctie/terugboeking"-knop op een gefinaliseerde factuur.
 * Planner selecteert bestaande regels om volledig te crediteren en/of vult
 * een vrije correctieregel in — create_credit_invoice() (035_invoice_credit_
 * notes.sql) maakt de gekoppelde, negatieve factuur aan.
 */
export function CreditInvoiceDialog({ lines, onSubmit }: CreditInvoiceDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [freeDescription, setFreeDescription] = useState('');
  const [freeAmountEuros, setFreeAmountEuros] = useState<number | undefined>(undefined);
  const [freeVatRate, setFreeVatRate] = useState(21);
  const [note, setNote] = useState('');

  function toggleLine(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleSubmit() {
    const selectedLines = lines
      .filter((line) => selectedIds.has(line.id))
      .map((line) => ({
        description: `Correctie: ${line.description}`,
        amountEuros: line.exclVatAmountCents / 100,
        vatRate: line.vatRate,
      }));

    const hasFreeLine = freeDescription.trim().length > 0 && freeAmountEuros !== undefined;
    const allLines = hasFreeLine
      ? [
          ...selectedLines,
          {
            description: freeDescription.trim(),
            amountEuros: freeAmountEuros!,
            vatRate: freeVatRate,
          },
        ]
      : selectedLines;

    if (allLines.length === 0) {
      toast.error('Selecteer minimaal één regel of vul een vrije correctieregel in.');
      return;
    }

    startTransition(async () => {
      const result = await onSubmit({ lines: allLines, note: note.trim() || undefined });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Creditfactuur aangemaakt');
      setOpen(false);
      router.push(`/facturen/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Correctie</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Creditfactuur aanmaken</DialogTitle>
          <DialogDescription>
            Selecteer regels om volledig te crediteren, of vul een vrije correctieregel in (BR-020:
            de originele factuur blijft ongewijzigd — correctie = aparte, negatieve factuur).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {lines.map((line) => (
            <Label key={line.id} className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.has(line.id)}
                onCheckedChange={() => toggleLine(line.id)}
              />
              <span className="flex-1">{line.description}</span>
              <span className="text-text-muted text-xs">{formatCents(line.totalAmountCents)}</span>
            </Label>
          ))}
        </div>

        <div className="space-y-2 border-t pt-3">
          <Label htmlFor="credit-free-description">Vrije correctieregel (optioneel)</Label>
          <Input
            id="credit-free-description"
            placeholder="Omschrijving"
            value={freeDescription}
            onChange={(e) => setFreeDescription(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              step={0.01}
              placeholder="Bedrag excl. BTW"
              value={freeAmountEuros ?? ''}
              onChange={(e) =>
                setFreeAmountEuros(
                  Number.isNaN(e.target.valueAsNumber) ? undefined : e.target.valueAsNumber,
                )
              }
            />
            <Select
              value={String(freeVatRate)}
              onValueChange={(value) => setFreeVatRate(Number(value))}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="21">21%</SelectItem>
                <SelectItem value="9">9%</SelectItem>
                <SelectItem value="0">0%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="credit-note">Toelichting (optioneel)</Label>
          <Textarea id="credit-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Annuleren
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Bezig…' : 'Creditfactuur aanmaken'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
