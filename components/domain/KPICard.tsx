import { Card, CardContent } from '@/components/primitives/card';

interface KPICardProps {
  label: string;
  value: string;
}

/** KPICard — 28_Dashboard.md § "6 secties (banners/KPI's/...)". Enkele betekenisvolle signalen, geen dichte cockpit. */
export function KPICard({ label, value }: KPICardProps) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="px-4">
        <p className="text-text-muted text-xs">{label}</p>
        <p className="text-text text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
