import type { AppError } from '@/lib/errors';

import type { AuthError } from '@supabase/supabase-js';

/**
 * Vertaalt Supabase Auth-foutcodes naar menselijke NL-meldingen
 * (22_Authenticatie.md § 9, 24_UI_UX.md § 5) — nooit een kale Engelse Auth-foutcode
 * naar de gebruiker.
 */
export function mapAuthError(error: AuthError): AppError {
  switch (error.code) {
    case 'invalid_credentials':
      return { code: error.code, message: 'E-mail of wachtwoord onjuist.' };
    case 'user_already_exists':
      return {
        code: error.code,
        message: 'Deze e-mail is al in gebruik.',
        hint: 'Log in of gebruik "Wachtwoord vergeten".',
      };
    case 'email_not_confirmed':
      return {
        code: error.code,
        message: 'Bevestig eerst je e-mailadres via de link die we je gestuurd hebben.',
      };
    case 'weak_password':
      return {
        code: error.code,
        message:
          'Dit wachtwoord is niet sterk genoeg (min. 8 tekens, hoofdletter, kleine letter en cijfer).',
      };
    case 'over_email_send_rate_limit':
      return {
        code: error.code,
        message: 'Je hebt net al een e-mail ontvangen. Wacht even voordat je het opnieuw probeert.',
      };
    case 'same_password':
      return {
        code: error.code,
        message: 'Kies een ander wachtwoord dan je huidige wachtwoord.',
      };
    default:
      return {
        code: error.code ?? 'auth_error',
        message: 'Er ging iets mis. Probeer het opnieuw.',
      };
  }
}
