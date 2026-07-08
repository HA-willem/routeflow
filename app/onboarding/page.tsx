import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/primitives/card';
import { requireUser } from '@/lib/auth/session';

import { OnboardingForm } from './onboarding-form';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bedrijf aanmaken — RouteFlow',
};

export default async function OnboardingPage() {
  await requireUser();

  return (
    <div className="bg-surface flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle>Welkom bij RouteFlow</CardTitle>
            <CardDescription>
              Hoe heet je bedrijf? Daarna plant RouteFlow automatisch je eerste week.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
