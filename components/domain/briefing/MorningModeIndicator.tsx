import type { MorningMode } from '@/lib/briefing/types';
import { cn } from '@/lib/utils';

const MODE_CONFIG: Record<MorningMode, { dotClass: string; label: string }> = {
  green: { dotClass: 'bg-success', label: 'Rustige dag' },
  yellow: { dotClass: 'bg-warning', label: 'Voorstellen te beoordelen' },
  red: { dotClass: 'bg-danger', label: 'Vraagt je aandacht' },
};

/**
 * Morning Mode-indicator (44_MorningBriefing_UX.md § 3.1/§ 6) — het enige
 * kleuraccent in het welkomstblok. Nooit alarmerend fel en nooit alleen kleur:
 * de stip draagt samen met het tekstlabel de betekenis (42_DesignSystem.md § 1).
 */
export function MorningModeIndicator({ mode }: { mode: MorningMode }) {
  const { dotClass, label } = MODE_CONFIG[mode];
  return (
    <span className="border-border bg-surface inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
      <span aria-hidden className={cn('size-2 rounded-full', dotClass)} />
      <span className="text-text">{label}</span>
    </span>
  );
}
