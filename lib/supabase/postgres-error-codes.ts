/**
 * Postgres SQLSTATE-codes waarop applicatiecode expliciet vertakt. Eén benoemde
 * bron i.p.v. losse magic strings die stilzwijgend uit sync raken met de
 * `errcode`-waarden in de SQL-migraties (bijv. onboard_company(),
 * 003_rls_baseline.sql).
 */
export const POSTGRES_ERROR_CODE = {
  /** 23505 unique_violation — o.a. onboard_company()'s "gebruiker heeft al een bedrijf"-guard. */
  UNIQUE_VIOLATION: '23505',
} as const;
