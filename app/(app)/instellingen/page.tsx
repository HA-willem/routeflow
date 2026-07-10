import Link from 'next/link';

import { PageHeader } from '@/components/composed/PageHeader';
import { Card, CardContent, CardTitle } from '@/components/primitives/card';
import { requireOnboardedUser } from '@/lib/auth/session';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Instellingen — RouteFlow',
};

export default async function InstellingenPage() {
  await requireOnboardedUser();

  return (
    <div>
      <PageHeader title="Instellingen" />
      <Link href="/instellingen/diensten" className="block max-w-sm">
        <Card>
          <CardContent>
            <CardTitle level="h2" className="text-base">
              Diensten
            </CardTitle>
            <p className="text-text-muted mt-1 text-sm">
              Beheer het aanbod diensten van je bedrijf (naam, duur, prijs, BTW).
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
