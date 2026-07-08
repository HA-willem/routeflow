import { z } from 'zod';

/**
 * Wachtwoordbeleid — 22_Authenticatie.md § 4: min. 8 tekens, min. 1 hoofdletter,
 * 1 kleine letter, 1 cijfer. Gedeeld tussen client-formulieren en Server Actions
 * (41_CodingStandards.md § 2/§ 7 — server valideert altijd opnieuw).
 */
export const passwordSchema = z
  .string()
  .min(8, 'Gebruik minimaal 8 tekens.')
  .regex(/[a-z]/, 'Gebruik minimaal 1 kleine letter.')
  .regex(/[A-Z]/, 'Gebruik minimaal 1 hoofdletter.')
  .regex(/[0-9]/, 'Gebruik minimaal 1 cijfer.');

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Vul een e-mailadres in.')
  .email('Voer een geldig e-mailadres in.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Vul je wachtwoord in.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Vul je naam in.').max(255),
    email: emailSchema,
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'De wachtwoorden komen niet overeen.',
    path: ['passwordConfirmation'],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'De wachtwoorden komen niet overeen.',
    path: ['passwordConfirmation'],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const onboardingSchema = z.object({
  companyName: z.string().trim().min(1, 'Vul je bedrijfsnaam in.').max(255),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;
