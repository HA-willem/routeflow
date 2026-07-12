/**
 * Datumhulpfuncties voor de Planning-module (Sprint 4 Frontend) — zuivere
 * datumlogica zonder I/O (41_CodingStandards.md § 12), zelfde UTC-middernacht-
 * conventie als lib/planning/horizon.ts (BR-805) om tijdzone-drift te vermijden.
 */

function toUtcDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  return toIso(new Date(toUtcDate(iso).getTime() + days * 24 * 60 * 60 * 1000));
}

/** JS `getUTCDay()` is 0=zondag; converteert naar 0=maandag (A-11, zelfde als horizon.ts). */
function isoWeekday(iso: string): number {
  const jsDay = toUtcDate(iso).getUTCDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** Vandaag als ISO-datum (UTC-middernacht-conventie). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  return addDays(iso, days);
}

/** Maandag t/m zondag van de week waarin `iso` valt (Nederlandse weekstart, A-11). */
export function weekDates(iso: string): string[] {
  const monday = addDays(iso, -isoWeekday(iso));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

const DAY_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

export function shortDayLabel(iso: string): string {
  return DAY_LABELS[isoWeekday(iso)]!;
}

export function formatDayHeading(iso: string): string {
  return toUtcDate(iso).toLocaleDateString('nl-NL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatWeekHeading(iso: string): string {
  const [monday, sunday] = [weekDates(iso)[0]!, weekDates(iso)[6]!];
  const mondayLabel = toUtcDate(monday).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
  });
  const sundayLabel = toUtcDate(sunday).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
  });
  return `${mondayLabel} – ${sundayLabel}`;
}

/**
 * Formatteert een `jobs.arrival_time`/`service_start`/`service_end` (timestamptz)
 * naar "HH:MM". `lib/routing/optimize.ts` (`minutesToIso`) schrijft kloktijden via
 * `setUTCHours` — d.w.z. de UTC-uurwaarde ĩs de bedoelde kloktijd, geen echte
 * Amsterdam-conversie. `getUTCHours()` lezen (i.p.v. `toLocaleTimeString` met een
 * tijdzone) is dus geen afronding maar de enige juiste manier om dezelfde waarde
 * terug te krijgen die de routing-engine bedoelde.
 */
export function formatClockTime(isoDateTime: string | null): string {
  if (!isoDateTime) return '—';
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return '—';
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
