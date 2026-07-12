import type { RouteColumn } from '@/components/domain/RouteBoard';
import { RouteStopList } from '@/components/domain/RouteStopList';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/primitives/dialog';
import { formatDayHeading } from '@/lib/planning/dates';

interface RouteDetailsDialogProps {
  column: RouteColumn | null;
  date: string;
  onOpenChange: (open: boolean) => void;
}

/**
 * Route-details — 42_DesignSystem.md § 16. Geen aparte pagina/URL (27_PaginaOverzicht.md
 * kent geen /planning/route/:id) — een paneel vanuit RouteBoard-kolomkop/JobCard-klik.
 * Op tablet-breedte neemt het Dialog-content de volle breedte in (§ 16/§ 25).
 */
export function RouteDetailsDialog({ column, date, onOpenChange }: RouteDetailsDialogProps) {
  return (
    <Dialog open={column !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-[calc(100%-2rem)] lg:max-w-xl">
        {column ? (
          <>
            <DialogHeader>
              <DialogTitle>{column.employeeName}</DialogTitle>
              <p className="text-text-muted text-sm capitalize">{formatDayHeading(date)}</p>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-4 text-sm tabular-nums">
              <div>
                <p className="text-text-muted text-xs">Beurten</p>
                <p className="text-text font-medium">{column.jobs.length}</p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Werktijd</p>
                <p className="text-text font-medium">
                  {Math.floor(column.totalWorkMinutes / 60)}u {column.totalWorkMinutes % 60}m
                </p>
              </div>
              <div>
                <p className="text-text-muted text-xs">Route</p>
                <p className="text-text font-medium">{column.routeId ? 'Gepland' : '—'}</p>
              </div>
            </div>
            <RouteStopList stops={column.jobs} />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
