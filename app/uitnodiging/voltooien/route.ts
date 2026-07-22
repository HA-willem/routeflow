import { redirect } from 'next/navigation';

import { logger } from '@/lib/logging/logger';
import { createClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

/**
 * Laatste stap van de medewerker-uitnodigingsflow (FR-103), aangeroepen door
 * /auth/confirm ná e-mailbevestiging (`next`-parameter). Op dit punt bestaat er
 * een sessie (auth.users) maar nog geen `public.users`-profiel — dezelfde
 * volgorde als onboarding (app/onboarding/actions.ts): eerst het account
 * koppelen via de SECURITY DEFINER-RPC, dan `company_id` in de JWT-claim
 * zetten (auth.updateUser + refreshSession), pas dan is de gebruiker
 * "onboarded" en kan /m de sessie herkennen.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    redirect('/login');
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: company, error } = await supabase.rpc('accept_employee_invite', {
    p_token: token,
  });

  if (error || !company) {
    logger.error('accept_employee_invite RPC mislukt', { code: error?.code, userId: user.id });
    redirect('/login');
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: { company_id: company.id },
  });

  if (updateError) {
    logger.error('Failed to link company_id onto user_metadata after invite acceptance', {
      code: updateError.code,
      userId: user.id,
      companyId: company.id,
    });
    redirect('/login');
  }

  await supabase.auth.refreshSession();

  redirect('/m');
}
