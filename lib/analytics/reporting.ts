/**
 * Rapportage-module (Sprint 10, `40_Implementatieplan.md` § Sprint 10,
 * `37_Performance.md` § 3). Pure aggregatiefuncties — de Server Component
 * (`app/(app)/rapportage/page.tsx`) haalt de ruwe, datumbereik-gefilterde
 * rijen op (geïndexeerd, `037_reporting_indexes.sql`) en geeft ze hier
 * binnen; geen materialized views deze ronde (scope-beslissing, PRD § 19).
 */

export interface InvoiceForRevenue {
  invoice_date: string;
  total_amount_cents: number;
  status: 'draft' | 'sent' | 'paid';
}

export interface RevenuePoint {
  /** `YYYY-MM`. */
  period: string;
  totalCents: number;
}

/** Alleen sent/paid telt als omzet — een conceptfactuur is nog geen gerealiseerde omzet. */
export function aggregateRevenueByMonth(invoices: InvoiceForRevenue[]): RevenuePoint[] {
  const totals = new Map<string, number>();
  for (const invoice of invoices) {
    if (invoice.status === 'draft') continue;
    const period = invoice.invoice_date.slice(0, 7);
    totals.set(period, (totals.get(period) ?? 0) + invoice.total_amount_cents);
  }
  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, totalCents]) => ({ period, totalCents }));
}

export interface RouteForEfficiency {
  total_distance_meters: number | null;
  total_drive_time_minutes: number | null;
  optimization_score: number | null;
}

export interface RouteEfficiencySummary {
  routeCount: number;
  avgDistanceMeters: number | null;
  avgDriveTimeMinutes: number | null;
  avgOptimizationScore: number | null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Routes zonder berekende waarden (nog niet geoptimaliseerd) tellen niet mee in het gemiddelde. */
export function summarizeRouteEfficiency(routes: RouteForEfficiency[]): RouteEfficiencySummary {
  return {
    routeCount: routes.length,
    avgDistanceMeters: average(
      routes.map((r) => r.total_distance_meters).filter((v): v is number => v !== null),
    ),
    avgDriveTimeMinutes: average(
      routes.map((r) => r.total_drive_time_minutes).filter((v): v is number => v !== null),
    ),
    avgOptimizationScore: average(
      routes.map((r) => r.optimization_score).filter((v): v is number => v !== null),
    ),
  };
}

export interface JobForProductivity {
  employeeId: string;
  employeeName: string;
}

export interface ProductivityRow {
  employeeId: string;
  employeeName: string;
  completedJobs: number;
}

/** Sorteert aflopend op aantal voltooide beurten — meest productieve medewerker eerst. */
export function aggregateProductivityByEmployee(jobs: JobForProductivity[]): ProductivityRow[] {
  const counts = new Map<string, ProductivityRow>();
  for (const job of jobs) {
    const existing = counts.get(job.employeeId);
    if (existing) {
      existing.completedJobs += 1;
    } else {
      counts.set(job.employeeId, {
        employeeId: job.employeeId,
        employeeName: job.employeeName,
        completedJobs: 1,
      });
    }
  }
  return Array.from(counts.values()).sort((a, b) => b.completedJobs - a.completedJobs);
}

/** CSV-export (FR-006-precedent, CsvImportWizard.tsx) — omzet-per-maand als downloadbaar rapport. */
export function revenueToCsv(points: RevenuePoint[]): string {
  const header = 'periode,omzet_cents';
  const rows = points.map((p) => `${p.period},${p.totalCents}`);
  return [header, ...rows].join('\n');
}
