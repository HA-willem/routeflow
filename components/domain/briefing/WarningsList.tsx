import { AlertTriangle, ArrowRight, Info } from 'lucide-react';
import Link from 'next/link';

import type { BriefingWarning } from '@/lib/briefing/types';
import { cn } from '@/lib/utils';

const SEVERITY_CONFIG = {
  info: { icon: Info, iconClass: 'text-info', label: 'Informatief' },
  attention: { icon: AlertTriangle, iconClass: 'text-warning', label: 'Aandacht' },
  urgent: { icon: AlertTriangle, iconClass: 'text-danger', label: 'Urgent' },
} as const;

/**
 * Waarschuwingen (44 § 3.7) — dingen die aandacht vragen maar geen voorstel
 * zijn. Ernst nooit alleen via kleur; elk item linkt naar waar het opgelost
 * wordt, nooit een formulier in de briefing zelf.
 */
export function WarningsList({ warnings }: { warnings: BriefingWarning[] }) {
  if (warnings.length === 0) return null;

  return (
    <section aria-label="Waarschuwingen" className="flex flex-col gap-2">
      <h2 className="text-text text-sm font-semibold">Waarschuwingen</h2>
      <ul className="flex flex-col gap-2">
        {warnings.map((warning) => {
          const config = SEVERITY_CONFIG[warning.severity];
          return (
            <li key={warning.id}>
              <Link
                href={warning.href}
                className="group border-border bg-bg hover:border-primary/40 flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors duration-150"
              >
                <config.icon aria-hidden className={cn('size-4 shrink-0', config.iconClass)} />
                <span className="sr-only">{config.label}:</span>
                <span className="text-text min-w-0 flex-1 text-sm">{warning.text}</span>
                <span className="text-text-muted group-hover:text-primary flex shrink-0 items-center gap-1 text-xs font-medium transition-colors duration-150">
                  {warning.hrefLabel}
                  <ArrowRight aria-hidden className="size-3" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
