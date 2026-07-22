'use server';

import { mapAuthError } from '@/lib/auth/error-messages';
import { siteUrl } from '@/lib/env';
import { actionError, actionSuccess, type ActionResult, validationActionError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { acceptInviteSchema } from '@/lib/validation/auth';

interface AcceptInviteResult {
  emailConfirmationRequired: boolean;
}

/**
 * Rondt een medewerker-uitnodiging af (FR-103, 22_Authenticatie.md § 8).
 * Hergebruikt het bestaande self-service `signUp()`-pad (app/(auth)/registreren/actions.ts)
 * i.p.v. de Admin-API: `lib/supabase/server.ts` staat bewust geen service-role-
 * gebruik in de applicatielaag toe (NFR-301). De koppeling naar `employees`/
 * `public.users` (accept_employee_invite()-RPC) gebeurt pas ná e-mailbevestiging,
 * in app/uitnodiging/voltooien/route.ts — zelfde volgorde als onboarding
 * (account eerst, bedrijfskoppeling daarna).
 */
export async function acceptInvite(
  token: string,
  input: unknown,
): Promise<ActionResult<AcceptInviteResult>> {
  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) {
    return validationActionError(parsed.error, 'Controleer het ingevulde wachtwoord.');
  }

  const supabase = await createClient();

  const { data: invite, error: inviteError } = await supabase
    .rpc('get_invite_by_token', { p_token: token })
    .maybeSingle();

  if (inviteError || !invite || !invite.valid) {
    return actionError({
      code: 'invalid_invite',
      message: 'Deze uitnodiging is niet (meer) geldig. Vraag je beheerder om een nieuwe.',
    });
  }

  const nextPath = `/uitnodiging/voltooien?token=${encodeURIComponent(token)}`;
  const confirmUrl = new URL('/auth/confirm', siteUrl);
  confirmUrl.searchParams.set('next', nextPath);

  const { data, error } = await supabase.auth.signUp({
    email: invite.email,
    password: parsed.data.password,
    options: { emailRedirectTo: confirmUrl.toString() },
  });

  if (error) {
    return actionError(mapAuthError(error));
  }

  return actionSuccess({ emailConfirmationRequired: data.session === null });
}
