'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
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
import { inviteEmployeeSchema, type InviteEmployeeInput } from '@/lib/validation/employee';

interface InviteEmployeeFormProps {
  employeeId: string;
  onInvite: (
    employeeId: string,
    values: InviteEmployeeInput,
  ) => Promise<{ success: true; data: null } | { success: false; error: { message: string } }>;
}

/** InviteEmployeeForm — FR-103, medewerker-uitnodiging (eigen inlogaccount). */
export function InviteEmployeeForm({ employeeId, onInvite }: InviteEmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<InviteEmployeeInput>({
    resolver: zodResolver(inviteEmployeeSchema),
    defaultValues: { email: '' },
  });

  function handleSubmit(values: InviteEmployeeInput) {
    startTransition(async () => {
      const result = await onInvite(employeeId, values);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Uitnodiging verstuurd');
      router.push('/instellingen/medewerkers');
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-xl space-y-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mailadres</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="naam@voorbeeld.nl"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Bezig met versturen…' : 'Uitnodigen'}
        </Button>
      </form>
    </Form>
  );
}
