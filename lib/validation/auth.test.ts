import { describe, expect, it } from 'vitest';

import {
  forgotPasswordSchema,
  loginSchema,
  onboardingSchema,
  passwordSchema,
  registerSchema,
  resetPasswordSchema,
} from './auth';

describe('passwordSchema (22_Authenticatie.md § 4)', () => {
  it('accepteert een wachtwoord met hoofdletter, kleine letter en cijfer, min. 8 tekens', () => {
    expect(passwordSchema.safeParse('Testwachtwoord123').success).toBe(true);
  });

  it('weigert een wachtwoord korter dan 8 tekens', () => {
    const result = passwordSchema.safeParse('Aa1aaaa');
    expect(result.success).toBe(false);
  });

  it('weigert een wachtwoord zonder hoofdletter', () => {
    expect(passwordSchema.safeParse('testwachtwoord123').success).toBe(false);
  });

  it('weigert een wachtwoord zonder kleine letter', () => {
    expect(passwordSchema.safeParse('TESTWACHTWOORD123').success).toBe(false);
  });

  it('weigert een wachtwoord zonder cijfer', () => {
    expect(passwordSchema.safeParse('Testwachtwoordxyz').success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepteert een geldig e-mailadres en niet-leeg wachtwoord', () => {
    expect(loginSchema.safeParse({ email: 'frans@routeflow.test', password: 'x' }).success).toBe(
      true,
    );
  });

  it('weigert een ongeldig e-mailadres', () => {
    expect(loginSchema.safeParse({ email: 'niet-een-email', password: 'x' }).success).toBe(false);
  });

  it('weigert een leeg wachtwoord', () => {
    expect(loginSchema.safeParse({ email: 'frans@routeflow.test', password: '' }).success).toBe(
      false,
    );
  });
});

describe('registerSchema', () => {
  const valid = {
    fullName: 'Frans de Haan',
    email: 'frans@routeflow.test',
    password: 'Testwachtwoord123',
    passwordConfirmation: 'Testwachtwoord123',
  };

  it('accepteert geldige, overeenkomende wachtwoorden', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('weigert niet-overeenkomende wachtwoorden', () => {
    const result = registerSchema.safeParse({
      ...valid,
      passwordConfirmation: 'Anderswachtwoord123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['passwordConfirmation']);
    }
  });

  it('weigert een lege naam', () => {
    expect(registerSchema.safeParse({ ...valid, fullName: '   ' }).success).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('vereist een geldig e-mailadres', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'frans@routeflow.test' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: '' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('weigert niet-overeenkomende nieuwe wachtwoorden', () => {
    const result = resetPasswordSchema.safeParse({
      password: 'Testwachtwoord123',
      passwordConfirmation: 'Anderswachtwoord123',
    });
    expect(result.success).toBe(false);
  });
});

describe('onboardingSchema (FR-101)', () => {
  it('vereist een niet-lege bedrijfsnaam', () => {
    expect(onboardingSchema.safeParse({ companyName: 'Glazenwasserij De Haan' }).success).toBe(
      true,
    );
    expect(onboardingSchema.safeParse({ companyName: '   ' }).success).toBe(false);
  });
});
