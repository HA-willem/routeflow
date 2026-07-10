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
import { resolveRedirectPath } from '@/lib/utils';
import { employeeSchema, type EmployeeInput } from '@/lib/validation/employee';

interface EmployeeFormProps {
  defaultValues?: Partial<EmployeeInput>;
  onSubmit: (
    values: EmployeeInput,
  ) => Promise<
    { success: true; data: { id: string } | null } | { success: false; error: { message: string } }
  >;
  submitLabel: string;
  /** Plain pad, evt. met een `:id`-placeholder (zie lib/utils.ts resolveRedirectPath). */
  redirectTo: string;
}

const DEFAULT_VALUES: EmployeeInput = {
  firstName: '',
  lastName: '',
  phone: '',
};

/** EmployeeForm — 11_DatabaseConcept.md § 3.5 (Medewerkers-instellingen). */
export function EmployeeForm({
  defaultValues,
  onSubmit,
  submitLabel,
  redirectTo,
}: EmployeeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<EmployeeInput>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  function handleSubmit(values: EmployeeInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Medewerker opgeslagen');
      router.push(resolveRedirectPath(redirectTo, result.data?.id ?? null));
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-xl space-y-4" noValidate>
        <FormField
          control={form.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Voornaam</FormLabel>
              <FormControl>
                <Input type="text" placeholder="Piet" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Achternaam</FormLabel>
              <FormControl>
                <Input type="text" placeholder="Jansen" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefoonnummer</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="0612345678" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
