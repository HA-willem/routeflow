'use server';

import { mapAuthError } from '@/lib/auth/error-messages';
import { siteUrl } from '@/lib/env';
import { actionError, actionSuccess, type ActionResult, validationActionError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { forgotPasswordSchema } from '@/lib/validation/auth';

export async function requestPasswordReset(input: unknown): Promise<ActionResult<null>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Vul een geldig e-mailadres in.');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/wachtwoord-vergeten/nieuw`,
  });

  // Supabase geeft bewust geen fout terug als het e-mailadres niet bestaat
  // (voorkomt user-enumeration); alleen echte verzendfouten komen hier terug.
  if (error) {
    return actionError(mapAuthError(error));
  }

  return actionSuccess(null);
}
