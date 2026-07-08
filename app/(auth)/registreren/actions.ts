'use server';

import { mapAuthError } from '@/lib/auth/error-messages';
import { siteUrl } from '@/lib/env';
import { actionError, actionSuccess, type ActionResult, validationActionError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { registerSchema } from '@/lib/validation/auth';

interface RegisterResult {
  emailConfirmationRequired: boolean;
}

export async function register(input: unknown): Promise<ActionResult<RegisterResult>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  });

  if (error) {
    return actionError(mapAuthError(error));
  }

  // Met auth.email.enable_confirmations=true (supabase/config.toml) levert signUp()
  // geen sessie op totdat de gebruiker de bevestigingslink volgt
  // (22_Authenticatie.md § 1).
  return actionSuccess({ emailConfirmationRequired: data.session === null });
}
