'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { useTheme } from '@/components/composed/ThemeProvider';
import { IconButton } from '@/components/primitives/icon-button';
import type { ThemePreference } from '@/lib/theme/constants';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Licht', icon: Sun },
  { value: 'dark', label: 'Donker', icon: Moon },
  { value: 'system', label: 'Systeem', icon: Monitor },
];

/**
 * ThemeToggle (25_DesignSystem.md § 7) — compacte 3-staten-schakelaar,
 * `role="radiogroup"` (één actieve keuze, geen aan/uit-paar zoals Switch).
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Thema"
      className="border-border inline-flex items-center gap-0.5 rounded-md border p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value;
        return (
          <IconButton
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            variant={active ? 'default' : 'ghost'}
            size="icon-sm"
            className={cn(!active && 'text-text-muted')}
            onClick={() => setPreference(value)}
          >
            <Icon className="size-4" aria-hidden />
          </IconButton>
        );
      })}
    </div>
  );
}
