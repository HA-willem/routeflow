'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function firstDayOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

const PRESETS: { label: string; range: () => { from: string; to: string } }[] = [
  {
    label: 'Deze maand',
    range: () => {
      const now = new Date();
      return { from: isoDate(startOfMonth(now)), to: isoDate(now) };
    },
  },
  {
    label: 'Vorige maand',
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: isoDate(start), to: isoDate(end) };
    },
  },
  {
    label: 'Dit jaar',
    range: () => {
      const now = new Date();
      return { from: isoDate(firstDayOfYear(now)), to: isoDate(now) };
    },
  },
];

/**
 * DateRangePicker — Sprint 10 (rapportage-module). Zelfde filosofie als
 * FilterBar.tsx: URL-search-params (`van`/`tot`) zijn de enige bron van
 * waarheid, de pagina (Server Component) blijft verantwoordelijk voor de
 * daadwerkelijke query/filtering (41_CodingStandards.md § 5/6).
 */
export function DateRangePicker({
  fromKey = 'van',
  toKey = 'tot',
}: {
  fromKey?: string;
  toKey?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const from = searchParams.get(fromKey) ?? '';
  const to = searchParams.get(toKey) ?? '';

  function updateRange(nextFrom: string, nextTo: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextFrom) next.set(fromKey, nextFrom);
    else next.delete(fromKey);
    if (nextTo) next.set(toKey, nextTo);
    else next.delete(toKey);
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="daterange-from">Van</Label>
        <Input
          id="daterange-from"
          type="date"
          value={from}
          onChange={(e) => updateRange(e.target.value, to)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="daterange-to">Tot en met</Label>
        <Input
          id="daterange-to"
          type="date"
          value={to}
          onChange={(e) => updateRange(from, e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const range = preset.range();
              updateRange(range.from, range.to);
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
