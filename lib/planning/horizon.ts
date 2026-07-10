/**
 * Horizon-laag (15_AIPlanner.md § 1.1, FR-020): berekent ideale beurt-data
 * voor dienstafspraken, zuivere datumlogica zonder I/O (41_CodingStandards.md
 * § 12) zodat BR-001/BR-101/BR-102/BR-103 zonder Supabase getest kunnen worden.
 *
 * Datums zijn ISO `YYYY-MM-DD`-strings (Postgres `date`), reken-intern op
 * UTC-middernacht om tijdzone-drift te vermijden (10_BusinessRules.md § BR-805).
 *
 * PRD § 19 A-11 registreert drie interpretaties die niet letterlijk in
 * 10_BusinessRules.md staan: de eerste beurt zonder voorgaande `uitgevoerd`-
 * beurt, de generalisatie van BR-103 (kwartaal) naar `monthly`/`yearly`, en de
 * weekdag-nummering (0 = maandag).
 */

export type FrequencyType =
  'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | 'once' | 'custom';

/** BR-103-default: "eerste donderdag" als geen voorkeursdag is ingesteld. Donderdag = index 3 (0=ma). */
const DEFAULT_PREFERRED_DAY = 3;

export interface HorizonAgreement {
  frequencyType: FrequencyType;
  /** Alleen betekenisvol voor weekly/biweekly/custom (008_service_agreements.sql). */
  frequencyIntervalDays: number | null;
  /** 0 = maandag … 6 = zondag (PRD § 19 A-11). */
  preferredDay: number | null;
  excludeDates: string[];
}

function toUtcDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** JS `getUTCDay()` is 0=zondag; converteert naar 0=maandag (A-11). */
function isoWeekday(date: Date): number {
  const jsDay = date.getUTCDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** Eerstvolgende datum (op-of-na `from`) met de gegeven ISO-weekdag (0=ma). */
function nextIsoWeekday(from: Date, weekday: number): Date {
  const diff = (weekday - isoWeekday(from) + 7) % 7;
  return addDays(from, diff);
}

/** Eerste voorkomen van `weekday` (0=ma) in de gegeven kalendermaand (BR-103). */
function firstWeekdayOfMonth(year: number, monthIndex0: number, weekday: number): Date {
  return nextIsoWeekday(new Date(Date.UTC(year, monthIndex0, 1)), weekday);
}

/** Startmaand (0-based) van het kalenderkwartaal waarin `date` valt (BR-103: Q1=jan-mrt, ...). */
function quarterStartMonth(monthIndex0: number): number {
  return Math.floor(monthIndex0 / 3) * 3;
}

/**
 * BR-001: ideale datum = laatste `uitgevoerd`-datum + interval (weekly/biweekly/
 * custom), of het kalender-gebaseerde patroon uit BR-103 (monthly/quarterly/yearly).
 * Zonder `lastCompletedDate` (eerste beurt, PRD § 19 A-11): eerstvolgende
 * voorkeursdag op-of-na `referenceDate`, of de eerste periode vanaf `referenceDate`.
 *
 * BR-102: `once` levert nooit een opvolger — retourneert `null` als er al een
 * `lastCompletedDate` is; anders diens eigen (enige) datum via de aanroeper.
 */
export function calculateIdealDate(
  agreement: HorizonAgreement,
  lastCompletedDate: string | null,
  referenceDate: string,
): string | null {
  const { frequencyType } = agreement;
  const preferredWeekday = agreement.preferredDay ?? DEFAULT_PREFERRED_DAY;
  const reference = toUtcDate(referenceDate);

  if (frequencyType === 'once') {
    if (lastCompletedDate) {
      return null;
    }
    return toIso(nextIsoWeekday(reference, preferredWeekday));
  }

  if (frequencyType === 'weekly' || frequencyType === 'biweekly' || frequencyType === 'custom') {
    const intervalDays = agreement.frequencyIntervalDays;
    if (!intervalDays) {
      throw new Error(
        `frequencyIntervalDays is verplicht voor frequencyType '${frequencyType}' (BR-102/service_agreements_custom_requires_interval).`,
      );
    }
    if (!lastCompletedDate) {
      return toIso(nextIsoWeekday(reference, preferredWeekday));
    }
    return toIso(addDays(toUtcDate(lastCompletedDate), intervalDays));
  }

  // monthly/quarterly/yearly: kalender-gebaseerd (BR-103 + generalisatie, A-11).
  const base = lastCompletedDate ? toUtcDate(lastCompletedDate) : reference;
  const year = base.getUTCFullYear();
  const monthIndex0 = base.getUTCMonth();

  if (frequencyType === 'monthly') {
    const targetMonth = lastCompletedDate ? monthIndex0 + 1 : monthIndex0;
    return toIso(firstWeekdayOfMonth(year, targetMonth, preferredWeekday));
  }

  if (frequencyType === 'quarterly') {
    const currentQuarterStart = quarterStartMonth(monthIndex0);
    const targetMonth = lastCompletedDate ? currentQuarterStart + 3 : currentQuarterStart;
    return toIso(firstWeekdayOfMonth(year, targetMonth, preferredWeekday));
  }

  // yearly
  const targetYear = lastCompletedDate ? year + 1 : year;
  return toIso(firstWeekdayOfMonth(targetYear, monthIndex0, preferredWeekday));
}

/**
 * FR-020: genereert voorgestelde beurt-data tot `weeks` weken na `fromDate`.
 * Ketent `calculateIdealDate` door (elke gegenereerde datum wordt de
 * "laatste"-datum voor de volgende iteratie) — er bestaat nog geen `uitgevoerd`-
 * beurt om op te baseren, dus de horizon-laag plant vooruit op zijn eigen
 * voorstellen. Datums in `excludeDates` worden overgeslagen maar tellen wel mee
 * in de keten (de volgende datum wordt alsnog vanaf de overgeslagen datum
 * berekend), zodat een uitgesloten datum geen structurele dagverschuiving
 * veroorzaakt.
 */
export function generateHorizonDates(params: {
  agreement: HorizonAgreement;
  lastCompletedDate: string | null;
  fromDate: string;
  weeks: number;
}): string[] {
  const { agreement, fromDate, weeks } = params;
  const horizonEnd = addDays(toUtcDate(fromDate), weeks * 7);
  const excludeDates = new Set(agreement.excludeDates);

  const dates: string[] = [];
  let cursor = params.lastCompletedDate;
  // Veiligheidslimiet: voorkomt een oneindige lus bij een onverwacht kapotte
  // configuratie (bv. interval=0 die door de DB-CHECK had moeten zijn geweigerd).
  const maxIterations = 260;

  for (let i = 0; i < maxIterations; i += 1) {
    const next = calculateIdealDate(agreement, cursor, fromDate);
    if (!next) {
      break;
    }
    if (toUtcDate(next).getTime() > horizonEnd.getTime()) {
      break;
    }
    if (!excludeDates.has(next)) {
      dates.push(next);
    }
    cursor = next;
    if (agreement.frequencyType === 'once') {
      break;
    }
  }

  return dates;
}
