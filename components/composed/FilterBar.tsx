'use client';

import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Input } from '@/components/primitives/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives/select';

import type { ChangeEvent, KeyboardEvent } from 'react';

export interface FilterBarSearchField {
  type: 'search';
  key: string;
  label: string;
  placeholder: string;
}

export interface FilterBarSelectField {
  type: 'select';
  key: string;
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
}

export type FilterBarField = FilterBarSearchField | FilterBarSelectField;

const CLEAR_VALUE = 'all';

/**
 * FilterBar — 26_ComponentLibrary.md § 3 ("filters + actieve-filter-chips").
 * Werkt uitsluitend via URL search params: elke wijziging navigeert naar
 * dezelfde route met bijgewerkte query. De pagina (Server Component) blijft
 * zo de enige bron van waarheid voor data/filtering (41_CodingStandards.md § 5/6) —
 * dit component bevat geen fetch en geen domeinlogica, alleen navigatie.
 */
export function FilterBar({ fields }: { fields: FilterBarField[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchField = fields.find(
    (field): field is FilterBarSearchField => field.type === 'search',
  );
  const [searchDraft, setSearchDraft] = useState(
    () => searchParams.get(searchField?.key ?? '') ?? '',
  );

  function updateParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    next.delete('page');
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function clearAll() {
    router.push(pathname);
  }

  const activeChips = fields
    .map((field) => {
      const value = searchParams.get(field.key);
      if (!value) return null;
      const displayValue =
        field.type === 'select'
          ? (field.options.find((option) => option.value === value)?.label ?? value)
          : `"${value}"`;
      return { key: field.key, label: `${field.label}: ${displayValue}` };
    })
    .filter((chip): chip is { key: string; label: string } => chip !== null);

  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {fields.map((field) => {
          if (field.type === 'search') {
            return (
              <div key={field.key} className="relative max-w-sm min-w-[220px] flex-1">
                <Search className="text-text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  aria-label={field.label}
                  placeholder={field.placeholder}
                  defaultValue={searchParams.get(field.key) ?? ''}
                  className="pl-9"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setSearchDraft(event.target.value)
                  }
                  onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
                    if (event.key === 'Enter') {
                      updateParam(field.key, searchDraft);
                    }
                  }}
                  onBlur={() => updateParam(field.key, searchDraft)}
                />
              </div>
            );
          }

          return (
            <Select
              key={field.key}
              value={searchParams.get(field.key) || CLEAR_VALUE}
              onValueChange={(value) => updateParam(field.key, value === CLEAR_VALUE ? '' : value)}
            >
              <SelectTrigger aria-label={field.label} className="w-[180px]">
                <SelectValue placeholder={field.placeholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CLEAR_VALUE}>{field.placeholder}</SelectItem>
                {field.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        })}
      </div>
      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                if (chip.key === searchField?.key) {
                  setSearchDraft('');
                }
                updateParam(chip.key, '');
              }}
              className="bg-surface border-border text-text-muted hover:text-text flex items-center gap-1 rounded-full border px-3 py-1 text-xs"
            >
              {chip.label}
              <X className="size-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-text-muted hover:text-text text-xs underline"
          >
            Wis filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
