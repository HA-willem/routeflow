import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/primitives/card';

import { ForgotPasswordForm } from './forgot-password-form';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wachtwoord vergeten — RouteFlow',
};

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wachtwoord vergeten</CardTitle>
        <CardDescription>
          Vul je e-mailadres in en we sturen je een link om een nieuw wachtwoord in te stellen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
