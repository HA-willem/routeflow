'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/primitives/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/primitives/form';
import { Input } from '@/components/primitives/input';
import { acceptInviteSchema, type AcceptInviteInput } from '@/lib/validation/auth';

interface AcceptInviteFormProps {
  token: string;
  email: string;
  onAccept: (
    token: string,
    values: AcceptInviteInput,
  ) => Promise<
    | { success: true; data: { emailConfirmationRequired: boolean } }
    | { success: false; error: { message: string } }
  >;
}

/** AcceptInviteForm — FR-103, wachtwoord instellen op /uitnodiging/[token]. */
export function AcceptInviteForm({ token, email, onAccept }: AcceptInviteFormProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmationSent, setConfirmationSent] = useState(false);

  const form = useForm<AcceptInviteInput>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: { password: '', passwordConfirmation: '' },
  });

  function handleSubmit(values: AcceptInviteInput) {
    startTransition(async () => {
      const result = await onAccept(token, values);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      if (result.data.emailConfirmationRequired) {
        setConfirmationSent(true);
      }
    });
  }

  if (confirmationSent) {
    return (
      <p className="text-text-muted text-sm">
        We hebben een bevestigingsmail gestuurd naar <strong>{email}</strong>. Klik op de link
        daarin om je account te activeren.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4" noValidate>
        <div>
          <label className="text-text-muted text-sm font-medium">E-mailadres</label>
          <p className="text-text mt-1 text-sm">{email}</p>
        </div>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wachtwoord</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="passwordConfirmation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wachtwoord bevestigen</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Bezig…' : 'Account activeren'}
        </Button>
      </form>
    </Form>
  );
}
