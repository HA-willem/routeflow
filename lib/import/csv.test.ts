import { describe, expect, it } from 'vitest';

import { extractHouseNumber, validateImportRow, validateImportRows } from './csv';

import type { ImportRowInput } from './csv';

function baseRow(overrides: Partial<ImportRowInput> = {}): ImportRowInput {
  return {
    rowNumber: 1,
    name: 'Bakkerij Jansen',
    email: 'info@bakkerijjansen.nl',
    phone: '0612345678',
    addressLine1: 'Kerkstraat 12',
    postalCode: '1234 AB',
    city: 'Nijmegen',
    ...overrides,
  };
}

describe('extractHouseNumber (RE-08-patroon)', () => {
  it('haalt het huisnummer uit het einde van het adres', () => {
    expect(extractHouseNumber('Kerkstraat 12')).toBe('12');
    expect(extractHouseNumber('Kerkstraat 12a')).toBe('12a');
  });

  it('geeft lege string voor een adres zonder nummer', () => {
    expect(extractHouseNumber('Kerkstraat')).toBe('');
  });
});

describe('validateImportRow (FR-006)', () => {
  it('accepteert een volledige particuliere rij', () => {
    const result = validateImportRow(baseRow(), {
      existingEmails: new Set(),
      seenEmails: new Set(),
    });
    expect(result.status).toBe('ok');
    expect(result.customerType).toBe('person');
  });

  it('markeert een rij met KVK-nummer als zakelijk', () => {
    const result = validateImportRow(baseRow({ kvkNumber: '12345678' }), {
      existingEmails: new Set(),
      seenEmails: new Set(),
    });
    expect(result.customerType).toBe('business');
  });

  it('weigert een rij zonder naam', () => {
    const result = validateImportRow(baseRow({ name: '' }), {
      existingEmails: new Set(),
      seenEmails: new Set(),
    });
    expect(result.status).toBe('error');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('weigert een ongeldige postcode', () => {
    const result = validateImportRow(baseRow({ postalCode: 'ABC' }), {
      existingEmails: new Set(),
      seenEmails: new Set(),
    });
    expect(result.status).toBe('error');
  });

  it('weigert een e-mail die al bij een bestaande klant hoort', () => {
    const result = validateImportRow(baseRow(), {
      existingEmails: new Set(['info@bakkerijjansen.nl']),
      seenEmails: new Set(),
    });
    expect(result.status).toBe('error');
    expect(result.errors).toContain('E-mailadres bestaat al bij een andere klant.');
  });

  it('weigert een e-mail die dubbel in het bestand voorkomt en registreert de eerste', () => {
    const seenEmails = new Set<string>();
    const first = validateImportRow(baseRow(), { existingEmails: new Set(), seenEmails });
    expect(first.status).toBe('ok');

    const second = validateImportRow(baseRow({ rowNumber: 2 }), {
      existingEmails: new Set(),
      seenEmails,
    });
    expect(second.status).toBe('error');
    expect(second.errors).toContain('E-mailadres komt dubbel voor in het bestand.');
  });

  it('accepteert een rij zonder e-mail (optioneel veld)', () => {
    const result = validateImportRow(baseRow({ email: undefined }), {
      existingEmails: new Set(),
      seenEmails: new Set(),
    });
    expect(result.status).toBe('ok');
  });
});

describe('validateImportRows (FR-006 AC3: foutrapport)', () => {
  it('telt OK/waarschuwing/fout correct en slaat geocoding over bij fouten', async () => {
    const rows: ImportRowInput[] = [
      baseRow({ rowNumber: 1, email: 'a@example.com' }),
      baseRow({ rowNumber: 2, name: '', email: 'b@example.com' }),
      baseRow({ rowNumber: 3, email: 'c@example.com', addressLine1: 'Onvindbaarlaan 1' }),
    ];

    let geocodeCalls = 0;
    const { results, summary } = await validateImportRows(rows, new Set(), async (input) => {
      geocodeCalls += 1;
      if (input.postalCode === '1234 AB' && input.houseNumber === '1') {
        return { status: 'not_found' };
      }
      return { status: 'ok', location: { lat: 51.8, lng: 5.85 } };
    });

    expect(summary.totalRows).toBe(3);
    expect(summary.okCount).toBe(1);
    expect(summary.warningCount).toBe(1);
    expect(summary.errorCount).toBe(1);
    // De foutrij (rij 2) mag geen geocode-aanroep triggeren.
    expect(geocodeCalls).toBe(2);

    expect(results[0]!.status).toBe('ok');
    expect(results[0]!.geocodeStatus).toBe('geocoded');
    expect(results[1]!.status).toBe('error');
    expect(results[1]!.geocodeStatus).toBe('skipped');
    expect(results[2]!.status).toBe('warning');
    expect(results[2]!.geocodeStatus).toBe('failed');
  });

  it('blokkeert de import niet bij een geocode-fout (warning, geen error)', async () => {
    const rows: ImportRowInput[] = [baseRow()];
    const { results } = await validateImportRows(rows, new Set(), async () => {
      throw new Error('Mapbox tijdelijk onbereikbaar');
    });
    expect(results[0]!.status).toBe('warning');
    expect(results[0]!.location).toBeNull();
  });
});
