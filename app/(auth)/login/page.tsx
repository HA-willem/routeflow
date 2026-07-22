import Link from 'next/link';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/primitives/card';

import { LoginForm } from './login-form';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inloggen — ServOps',
};

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inloggen</CardTitle>
        <CardDescription>Log in om je planning en klanten te beheren.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LoginForm />
        <p className="text-text-muted text-center text-sm">
          Nog geen account?{' '}
          <Link href="/registreren" className="underline underline-offset-4">
            Registreren
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
