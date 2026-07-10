import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  label: string;
  tone: 'success' | 'warning' | 'muted';
  className?: string;
}

const TONE_CLASSES: Record<StatusBadgeProps['tone'], string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  muted: 'bg-surface text-text-muted',
};

/**
 * StatusBadge — 26_ComponentLibrary.md § 4. Kleur is nooit de enige
 * informatiedrager (25_DesignSystem.md § 1.2) — altijd met een tekstlabel.
 */
export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
