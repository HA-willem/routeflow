'use client';

import { Button } from '@/components/primitives/button';
import { revenueToCsv } from '@/lib/analytics/reporting';
import type { RevenuePoint } from '@/lib/analytics/reporting';

/** CSV-export — zelfde blob-download-aanpak als CsvImportWizard.tsx's foutlog-download. */
export function RevenueExportButton({ points }: { points: RevenuePoint[] }) {
  function handleExport() {
    const csv = revenueToCsv(points);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'omzet-rapport.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={points.length === 0}
    >
      Exporteren (CSV)
    </Button>
  );
}
