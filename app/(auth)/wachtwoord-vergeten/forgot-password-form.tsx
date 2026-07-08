'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
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
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validation/auth';

import { requestPasswordReset } from './actions';

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  function onSubmit(values: ForgotPasswordInput) {
    startTransition(async () => {
      const result = await requestPasswordReset(values);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-text text-base font-medium">Controleer je inbox</p>
        <p className="text-text-muted text-sm">
          Als dit e-mailadres bij ons bekend is, hebben we een link gestuurd om je wachtwoord
          opnieuw in te stellen.
        </p>
        <Link href="/login" className="text-sm underline underline-offset-4">
          Terug naar inloggen
        </Link>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mailadres</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Bezig met versturen…' : 'Verstuur resetlink'}
        </Button>
      </form>
    </Form>
  );
}
