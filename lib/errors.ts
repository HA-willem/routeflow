/**
 * Uniform foutmodel — 13_API_Specificatie.md § 6, toegepast op Server Actions
 * (41_CodingStandards.md § 7/§ 10). `code` is machine-leesbaar en stabiel,
 * `message` is de mens-gerichte NL-tekst (24_UI_UX.md § 5), `hint` is optioneel.
 */
export interface AppError {
  code: string;
  message: string;
  hint?: string;
}

export type ActionResult<T> = { success: true; data: T } | { success: false; error: AppError };

export function actionError(error: AppError): { success: false; error: AppError } {
  return { success: false, error };
}

export function actionSuccess<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}
