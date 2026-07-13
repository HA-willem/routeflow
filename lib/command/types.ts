/** Zoekresultaat-shape voor de Command Bar (⌘K) — gedeeld tussen Server Action en client. */
export interface CommandCustomerResult {
  id: string;
  name: string;
  city: string | null;
}
