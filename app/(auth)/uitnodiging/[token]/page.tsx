import { AcceptInviteForm } from '@/components/domain/AcceptInviteForm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/primitives/card';
import { createClient } from '@/lib/supabase/server';

import { acceptInvite } from './actions';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Uitnodiging accepteren — ServOps',
};

export default async function UitnodigingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: invite } = await supabase
    .rpc('get_invite_by_token', { p_token: token })
    .maybeSingle();

  if (!invite || !invite.valid) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Uitnodiging niet geldig</CardTitle>
          <CardDescription>
            Deze link is verlopen of al gebruikt. Vraag je beheerder om een nieuwe uitnodiging.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welkom bij {invite.company_name}</CardTitle>
        <CardDescription>Stel een wachtwoord in om je account te activeren.</CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptInviteForm token={token} email={invite.email} onAccept={acceptInvite} />
      </CardContent>
    </Card>
  );
}
