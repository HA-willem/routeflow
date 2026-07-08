import { describe, expect, it } from 'vitest';

import { mapAuthError } from './error-messages';

import type { AuthError } from '@supabase/supabase-js';

function fakeAuthError(code: string): AuthError {
  return {
    name: 'AuthApiError',
    message: 'irrelevant raw message',
    status: 400,
    code,
  } as AuthError;
}

describe('mapAuthError (22_Authenticatie.md § 9)', () => {
  it('vertaalt invalid_credentials naar een NL-melding zonder de rauwe Engelse tekst', () => {
    const result = mapAuthError(fakeAuthError('invalid_credentials'));
    expect(result.message).toBe('E-mail of wachtwoord onjuist.');
    expect(result.message).not.toMatch(/credentials/i);
  });

  it('vertaalt user_already_exists met een hint', () => {
    const result = mapAuthError(fakeAuthError('user_already_exists'));
    expect(result.message).toContain('al in gebruik');
    expect(result.hint).toBeDefined();
  });

  it('valt terug op een generieke melding bij een onbekende foutcode', () => {
    const result = mapAuthError(fakeAuthError('iets_nieuws_onbekend'));
    expect(result.message).toBe('Er ging iets mis. Probeer het opnieuw.');
  });
});
