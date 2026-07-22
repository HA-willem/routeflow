'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/primitives/button';
import { Checkbox } from '@/components/primitives/checkbox';
import { Label } from '@/components/primitives/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives/select';
import { BRANCHE_TEMPLATES, INDUSTRIES } from '@/lib/branche-templates/data';
import { formatCents } from '@/lib/invoicing/money';

interface BrancheTemplateImportFormProps {
  defaultIndustryId?: string | null;
  onImport: (
    input: unknown,
  ) => Promise<
    { success: true; data: { count: number } } | { success: false; error: { message: string } }
  >;
}

/** BrancheTemplateImportForm — FR-104, sjabloon-import met preview. */
export function BrancheTemplateImportForm({
  defaultIndustryId,
  onImport,
}: BrancheTemplateImportFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [industryId, setIndustryId] = useState(defaultIndustryId ?? INDUSTRIES[0]!.id);
  const services = BRANCHE_TEMPLATES[industryId] ?? [];
  const [checked, setChecked] = useState<Set<string>>(new Set(services.map((s) => s.name)));

  function handleIndustryChange(nextIndustryId: string) {
    setIndustryId(nextIndustryId);
    setChecked(new Set((BRANCHE_TEMPLATES[nextIndustryId] ?? []).map((s) => s.name)));
  }

  function toggle(name: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleImport() {
    startTransition(async () => {
      const result = await onImport({
        industryId,
        serviceNames: Array.from(checked),
      });
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`${result.data.count} dienst(en) geïmporteerd`);
      router.push('/instellingen/diensten');
    });
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <Label htmlFor="branche-select">Branche</Label>
        <Select value={industryId} onValueChange={handleIndustryChange}>
          <SelectTrigger id="branche-select" className="mt-1 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRIES.map((industry) => (
              <SelectItem key={industry.id} value={industry.id}>
                {industry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {services.length === 0 ? (
        <p className="text-text-muted text-sm">
          Voor deze branche is nog geen sjabloon beschikbaar — voeg diensten handmatig toe.
        </p>
      ) : (
        <div className="border-border divide-border divide-y rounded-md border">
          {services.map((service) => (
            <label key={service.name} className="flex items-center gap-3 p-3 text-sm">
              <Checkbox
                checked={checked.has(service.name)}
                onCheckedChange={() => toggle(service.name)}
              />
              <span className="flex-1">{service.name}</span>
              <span className="text-text-muted">
                {service.standardDurationMinutes} min ·{' '}
                {formatCents(service.standardPriceEuros * 100)}
              </span>
            </label>
          ))}
        </div>
      )}

      <Button type="button" onClick={handleImport} disabled={isPending || checked.size === 0}>
        {isPending ? 'Bezig met importeren…' : `${checked.size} dienst(en) importeren`}
      </Button>
    </div>
  );
}
