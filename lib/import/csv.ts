import type { GeocodeResult } from '@/lib/routing/types';
import { customerSchema } from '@/lib/validation/customer';
import { objectSchema } from '@/lib/validation/object';

/**
 * FR-006: CSV-import klanten/objecten. Aanname (PRD § 19 A-29): één CSV-rij =
 * één klant + één (primair) object/adres — geen meerdere objecten per klant
 * in dezelfde import. Hergebruikt customerSchema/objectSchema (Sprint 1/2)
 * zodat een CSV-rij exact dezelfde regels volgt als het handmatige formulier;
 * velden die niet in een typische CSV staan (billingPreference, opt-ins,
 * betaaltermijn, objecttype) krijgen een vaste standaardwaarde.
 */

export const IMPORT_TARGET_FIELDS = [
  { key: 'name', label: 'Naam', required: true },
  { key: 'email', label: 'E-mail', required: false },
  { key: 'phone', label: 'Telefoon', required: false },
  { key: 'kvkNumber', label: 'KVK-nummer (zakelijk)', required: false },
  { key: 'addressLine1', label: 'Adres (straat + huisnummer)', required: true },
  { key: 'postalCode', label: 'Postcode', required: true },
  { key: 'city', label: 'Plaats', required: true },
] as const;

export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number]['key'];

export const DEFAULT_PAYMENT_TERMS_DAYS = 14;

export interface ImportRowInput {
  rowNumber: number;
  name: string;
  email?: string;
  phone?: string;
  kvkNumber?: string;
  addressLine1: string;
  postalCode: string;
  city: string;
}

export interface ImportRowValidated extends ImportRowInput {
  status: 'ok' | 'warning' | 'error';
  customerType: 'person' | 'business';
  errors: string[];
  geocodeStatus: 'geocoded' | 'failed' | 'skipped';
  location: { lat: number; lng: number } | null;
}

export interface ImportSummary {
  totalRows: number;
  okCount: number;
  warningCount: number;
  errorCount: number;
}

/**
 * Puur/synchroon (geen netwerk-I/O) — vandaar los van de geocoding-stap,
 * makkelijk unit-testbaar. Muteert `context.seenEmails` bewust (rij-voor-rij
 * dubbele-e-mail-detectie binnen hetzelfde bestand).
 */
export function validateImportRow(
  row: ImportRowInput,
  context: { existingEmails: Set<string>; seenEmails: Set<string> },
): { status: 'ok' | 'error'; errors: string[]; customerType: 'person' | 'business' } {
  const errors: string[] = [];
  const customerType: 'person' | 'business' = row.kvkNumber ? 'business' : 'person';

  const customerParsed = customerSchema.safeParse({
    name: row.name,
    type: customerType,
    email: row.email,
    phone: row.phone,
    whatsappNumber: undefined,
    whatsappOptIn: false,
    emailOptIn: true,
    billingPreference: 'email',
    kvkNumber: row.kvkNumber,
    vatNumber: undefined,
    paymentTermsDays: DEFAULT_PAYMENT_TERMS_DAYS,
    notes: undefined,
  });
  if (!customerParsed.success) {
    errors.push(...customerParsed.error.issues.map((issue) => issue.message));
  }

  const objectParsed = objectSchema.safeParse({
    addressLine1: row.addressLine1,
    addressLine2: undefined,
    postalCode: row.postalCode,
    city: row.city,
    countryCode: 'NL',
    type: 'residence',
    accessNotes: undefined,
  });
  if (!objectParsed.success) {
    errors.push(...objectParsed.error.issues.map((issue) => issue.message));
  }

  const normalizedEmail = row.email?.trim().toLowerCase();
  if (normalizedEmail) {
    if (context.existingEmails.has(normalizedEmail)) {
      errors.push('E-mailadres bestaat al bij een andere klant.');
    } else if (context.seenEmails.has(normalizedEmail)) {
      errors.push('E-mailadres komt dubbel voor in het bestand.');
    } else {
      context.seenEmails.add(normalizedEmail);
    }
  }

  return { status: errors.length === 0 ? 'ok' : 'error', errors, customerType };
}

/** RE-08-patroon (mapbox-provider.ts): huisnummer = laatste cijferreeks van het adres. */
export function extractHouseNumber(addressLine1: string): string {
  const match = /(\d+\w*)\s*$/.exec(addressLine1 ?? '');
  return match?.[1] ?? '';
}

type GeocodeFn = (input: {
  postalCode: string;
  houseNumber: string;
  countryCode: string;
}) => Promise<GeocodeResult>;

/**
 * Valideert alle rijen (schema + dubbele-e-mail) en geocodet vervolgens
 * uitsluitend de rijen die de validatie doorstaan, met een kleine
 * concurrency-limiet (de bestaande Mapbox-retry/backoff in mapbox-provider.ts
 * is niet ontworpen voor honderden sequentiële calls, maar onbeperkt
 * parallel zou de Mapbox-rate-limit direct raken). Een adres dat niet
 * geocodeerbaar is blokkeert de import NIET (`status: 'warning'`) — de klant
 * wordt met `location_status: 'failed'` aangemaakt en kan later alsnog
 * geocodet worden (zelfde fallback als route-optimize/index.ts vandaag doet).
 */
export async function validateImportRows(
  rows: ImportRowInput[],
  existingEmails: Set<string>,
  geocode: GeocodeFn,
  concurrency = 5,
): Promise<{ results: ImportRowValidated[]; summary: ImportSummary }> {
  const seenEmails = new Set<string>();
  const validations = rows.map((row) => ({
    row,
    ...validateImportRow(row, { existingEmails, seenEmails }),
  }));

  const results: ImportRowValidated[] = new Array(validations.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < validations.length) {
      const index = cursor;
      cursor += 1;
      const item = validations[index]!;

      if (item.status === 'error') {
        results[index] = {
          ...item.row,
          status: 'error',
          customerType: item.customerType,
          errors: item.errors,
          geocodeStatus: 'skipped',
          location: null,
        };
        continue;
      }

      try {
        const geocodeResult = await geocode({
          postalCode: item.row.postalCode,
          houseNumber: extractHouseNumber(item.row.addressLine1),
          countryCode: 'NL',
        });

        if (geocodeResult.status === 'ok' && geocodeResult.location) {
          results[index] = {
            ...item.row,
            status: 'ok',
            customerType: item.customerType,
            errors: [],
            geocodeStatus: 'geocoded',
            location: geocodeResult.location,
          };
        } else {
          results[index] = {
            ...item.row,
            status: 'warning',
            customerType: item.customerType,
            errors: ['Adres kon niet automatisch gevonden worden.'],
            geocodeStatus: 'failed',
            location: null,
          };
        }
      } catch {
        results[index] = {
          ...item.row,
          status: 'warning',
          customerType: item.customerType,
          errors: ['Adres kon niet automatisch gevonden worden.'],
          geocodeStatus: 'failed',
          location: null,
        };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, validations.length) }, worker));

  return {
    results,
    summary: {
      totalRows: results.length,
      okCount: results.filter((r) => r.status === 'ok').length,
      warningCount: results.filter((r) => r.status === 'warning').length,
      errorCount: results.filter((r) => r.status === 'error').length,
    },
  };
}
