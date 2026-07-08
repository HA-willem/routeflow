import type { ZodError } from 'zod';

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

/**
 * Zet een mislukte Zod-validatie om naar het uniforme foutmodel — elke Server
 * Action deed dit voorheen zelf met dezelfde `code: 'validation_error'` en
 * `issues[0]?.message`-logica (41_CodingStandards.md § 7: "server-side herhaald").
 */
export function validationActionError(
  error: ZodError,
  fallbackMessage: string,
): { success: false; error: AppError } {
  return actionError({
    code: 'validation_error',
    message: error.issues[0]?.message ?? fallbackMessage,
  });
}
