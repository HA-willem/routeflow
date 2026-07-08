import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/primitives/card';
import { requireUser } from '@/lib/auth/session';

import { ResetPasswordForm } from './reset-password-form';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nieuw wachtwoord — RouteFlow',
};

export default async function ResetPasswordPage() {
  // De sessie is al server-side tot stand gekomen via app/auth/confirm/route.ts
  // (PKCE-uitwisseling); zonder geldige sessie is deze link verlopen/ongeldig.
  await requireUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nieuw wachtwoord instellen</CardTitle>
        <CardDescription>Kies een nieuw wachtwoord voor je account.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm />
      </CardContent>
    </Card>
  );
}
