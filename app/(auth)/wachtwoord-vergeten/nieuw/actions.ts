'use server';

import { redirect } from 'next/navigation';

import { mapAuthError } from '@/lib/auth/error-messages';
import { type ActionResult, actionError, validationActionError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { resetPasswordSchema } from '@/lib/validation/auth';

export async function updatePassword(input: unknown): Promise<ActionResult<null>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return actionError({
      code: 'recovery_session_missing',
      message: 'Deze link is verlopen of al gebruikt.',
      hint: 'Vraag een nieuwe link aan via "Wachtwoord vergeten".',
    });
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return actionError(mapAuthError(error));
  }

  redirect('/');
}
