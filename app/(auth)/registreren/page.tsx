import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/primitives/card';

import { RegisterForm } from './register-form';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Registreren — RouteFlow',
};

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account aanmaken</CardTitle>
        <CardDescription>Begin binnen 15 minuten met je eerste geplande week.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RegisterForm />
        <p className="text-text-muted text-center text-sm">
          Al een account?{' '}
          <Link href="/login" className="underline underline-offset-4">
            Inloggen
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
