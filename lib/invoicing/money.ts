/**
 * Geldbedragen in centen (11_DatabaseConcept.md § 3.6) + BTW-berekening
 * (16_Facturatie.md § 4). Spiegelt de formule uit `complete_job()`
 * (020_job_completion.sql) zodat PDF/UI dezelfde afronding gebruiken.
 */

export function calculateVat(
  unitPriceCents: number,
  vatRate: number,
): { vatAmountCents: number; totalAmountCents: number } {
  const vatAmountCents = Math.round((unitPriceCents * vatRate) / 100);
  return { vatAmountCents, totalAmountCents: unitPriceCents + vatAmountCents };
}

export function formatCents(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency }).format(cents / 100);
}
