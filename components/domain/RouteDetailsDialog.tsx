'use client';

import { Car, FileText, MapPin, XIcon } from 'lucide-react';
import Link from 'next/link';
import { Dialog as DialogPrimitive } from 'radix-ui';

import type { RouteColumn } from '@/components/domain/RouteBoard';
import { RouteStopList } from '@/components/domain/RouteStopList';
import { formatDayHeading } from '@/lib/planning/dates';

interface RouteDetailsDialogProps {
  column: RouteColumn | null;
  date: string;
  onOpenChange: (open: boolean) => void;
}

function formatMinutes(minutes: number): string {
  return `${Math.floor(minutes / 60)}u ${minutes % 60}m`;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

/**
 * Route-details — 42_DesignSystem.md § 16. Geen aparte pagina/URL (27_PaginaOverzicht.md
 * kent geen /planning/route/:id) — een zijpaneel vanuit RouteBoard-kolomkop/JobCard-klik,
 * met stops-tijdlijn, rijtijd/afstand-totalen en werkbon-links per uitgevoerde beurt.
 */
export function RouteDetailsDialog({ column, date, onOpenChange }: RouteDetailsDialogProps) {
  const totalDriveSec = (column?.jobs ?? []).reduce(
    (sum, job) => sum + (job.driveTimeFromPrevSec ?? 0),
    0,
  );
  const totalDistanceM = (column?.jobs ?? []).reduce(
    (sum, job) => sum + (job.distanceFromPrevM ?? 0),
    0,
  );

  return (
    <DialogPrimitive.Root open={column !== null} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="bg-bg border-border data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:animate-in data-[state=open]:slide-in-from-right fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l shadow-lg duration-200 outline-none sm:max-w-md"
        >
          {column ? (
            <>
              <header className="border-border flex items-start justify-between gap-4 border-b px-6 py-5">
                <div className="flex items-center gap-3">
                  <span className="bg-surface text-text flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                    {column.employeeName.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <DialogPrimitive.Title className="text-text text-base font-semibold">
                      {column.employeeName}
                    </DialogPrimitive.Title>
                    <p className="text-text-muted text-sm capitalize">{formatDayHeading(date)}</p>
                  </div>
                </div>
                <DialogPrimitive.Close
                  aria-label="Sluiten"
                  className="text-text-muted hover:bg-surface hover:text-text rounded-md p-1.5 transition-colors duration-150"
                >
                  <XIcon className="size-4" />
                </DialogPrimitive.Close>
              </header>

              <div className="border-border grid grid-cols-4 gap-4 border-b px-6 py-4 text-sm tabular-nums">
                <div>
                  <p className="text-text-muted text-xs">Beurten</p>
                  <p className="text-text font-medium">{column.jobs.length}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs">Werktijd</p>
                  <p className="text-text font-medium">{formatMinutes(column.totalWorkMinutes)}</p>
                </div>
                <div>
                  <p className="text-text-muted flex items-center gap-1 text-xs">
                    <Car aria-hidden className="size-3" />
                    Rijtijd
                  </p>
                  <p className="text-text font-medium">
                    {totalDriveSec > 0 ? `${Math.round(totalDriveSec / 60)} min` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted flex items-center gap-1 text-xs">
                    <MapPin aria-hidden className="size-3" />
                    Afstand
                  </p>
                  <p className="text-text font-medium">
                    {totalDistanceM > 0 ? formatDistance(totalDistanceM) : '—'}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-2">
                <RouteStopList
                  stops={column.jobs}
                  renderStopAction={(stop) =>
                    stop.status === 'completed' || stop.status === 'invoiced' ? (
                      <Link
                        href={`/planning/werkbon/${stop.id}`}
                        className="text-primary mt-1 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                      >
                        <FileText aria-hidden className="size-3" />
                        Werkbon
                      </Link>
                    ) : null
                  }
                />
              </div>
            </>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
