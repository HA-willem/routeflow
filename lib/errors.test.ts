import { describe, expect, it } from 'vitest';

import { actionError, actionSuccess } from './errors';

describe('actionSuccess / actionError (13_API_Specificatie.md § 6)', () => {
  it('produceert een discriminated union met success: true', () => {
    const result = actionSuccess({ id: '1' });
    expect(result).toEqual({ success: true, data: { id: '1' } });
  });

  it('produceert een discriminated union met success: false en een AppError', () => {
    const result = actionError({ code: 'invalid_credentials', message: 'Fout.' });
    expect(result).toEqual({
      success: false,
      error: { code: 'invalid_credentials', message: 'Fout.' },
    });
  });
});
