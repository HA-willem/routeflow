'use server';

import { redirect } from 'next/navigation';

import { mapAuthError } from '@/lib/auth/error-messages';
import { type ActionResult, actionError, validationActionError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/lib/validation/auth';

export async function login(input: unknown): Promise<ActionResult<null>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer de ingevulde gegevens.');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return actionError(mapAuthError(error));
  }

  redirect('/');
}
