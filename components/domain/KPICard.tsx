import { Card, CardContent } from '@/components/primitives/card';
import { cn } from '@/lib/utils';

export type KPITone = 'info' | 'warning' | 'success' | 'primary';

/** Cyclische standaardvolgorde voor call sites met meerdere KPICards op een rij (42_DesignSystem.md-changelog: dashboard/Vandaag, "pop"-behandeling). */
export const KPI_TONES: readonly KPITone[] = ['info', 'warning', 'success', 'primary'];

const TONE_CLASSES: Record<KPITone, string> = {
  info: 'bg-info/10',
  warning: 'bg-warning/10',
  success: 'bg-success/10',
  primary: 'bg-primary/10',
};

interface KPICardProps {
  label: string;
  value: string;
  /**
   * Zachte kleurtint i.p.v. de neutrale kaartachtergrond (StatusBadge.tsx-
   * patroon hergebruikt, geen nieuwe tokens). Optioneel — zonder `tone` blijft
   * het bestaande neutrale gedrag ongewijzigd voor callers die dat nog niet
   * hebben overgezet.
   */
  tone?: KPITone;
}

/** KPICard — 28_Dashboard.md § "6 secties (banners/KPI's/...)". Enkele betekenisvolle signalen, geen dichte cockpit. */
export function KPICard({ label, value, tone }: KPICardProps) {
  return (
    <Card className={cn('gap-1 py-4', tone && ['border-none shadow-none', TONE_CLASSES[tone]])}>
      <CardContent className="px-4">
        <p className="text-text-muted text-xs">{label}</p>
        <p className="text-text text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
