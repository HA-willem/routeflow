import { z } from 'zod';

import { emailSchema } from '@/lib/validation/auth';

/** Medewerker — 11_DatabaseConcept.md § 3.5, FR-021. */
export const employeeSchema = z.object({
  firstName: z.string().trim().min(1, 'Vul een voornaam in.').max(100),
  lastName: z.string().trim().min(1, 'Vul een achternaam in.').max(100),
  phone: z.string().trim().min(1, 'Vul een telefoonnummer in.').max(20),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;

/** Medewerker-uitnodiging (eigen inlogaccount) — 22_Authenticatie.md § 8, FR-103. */
export const inviteEmployeeSchema = z.object({
  email: emailSchema,
});

export type InviteEmployeeInput = z.infer<typeof inviteEmployeeSchema>;
