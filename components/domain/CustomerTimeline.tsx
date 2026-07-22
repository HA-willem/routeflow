'use client';

import Link from 'next/link';
import { useState } from 'react';

import { cn } from '@/lib/utils';

export interface TimelineItem {
  id: string;
  kind: 'beurt' | 'factuur';
  date: string;
  label: string;
  detail: string;
  href?: string;
}

type Filter = 'alle' | 'beurten' | 'facturen';

const FILTER_LABEL: Record<Filter, string> = {
  alle: 'Alles',
  beurten: 'Beurten',
  facturen: 'Facturen',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * FR-007: Tijdlijn — bewust verkleinde scope (PRD § 19 A-29): alleen
 * beurten+facturen (geen communicatie-log, geen niet-thuis-historie, geen
 * gebruiker-attributie — die data bestaat nergens in het schema). Filter is
 * client-side state i.p.v. een URL-query-param: de omringende Tabs
 * (components/composed/Tabs.tsx) is zelf al ongecontroleerd/niet
 * URL-gebonden, dus een query-param-navigatie zou de hele pagina herladen en
 * onbedoeld terugvallen op de "Gegevens"-tab.
 */
export function CustomerTimeline({ items }: { items: TimelineItem[] }) {
  const [filter, setFilter] = useState<Filter>('alle');

  const filtered = items.filter((item) => {
    if (filter === 'alle') return true;
    if (filter === 'beurten') return item.kind === 'beurt';
    return item.kind === 'factuur';
  });

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(Object.keys(FILTER_LABEL) as Filter[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs',
              filter === key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-text-muted hover:text-text',
            )}
          >
            {FILTER_LABEL[key]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-muted text-sm">Nog geen events voor deze weergave.</p>
      ) : (
        <ol className="border-border space-y-3 border-l pl-4">
          {filtered.map((item) => (
            <li key={`${item.kind}-${item.id}`} className="text-sm">
              <p className="text-text-muted text-xs">{formatDate(item.date)}</p>
              {item.href ? (
                <Link href={item.href} className="text-text font-medium underline">
                  {item.label}
                </Link>
              ) : (
                <p className="text-text font-medium">{item.label}</p>
              )}
              <p className="text-text-muted text-xs">{item.detail}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
