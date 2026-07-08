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
import { onboardingSchema, type OnboardingInput } from '@/lib/validation/auth';

import { onboardCompany } from './actions';

export function OnboardingForm() {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { companyName: '' },
  });

  function onSubmit(values: OnboardingInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await onboardCompany(values);
      if (!result.success) {
        setFormError(result.error.message);
        toast.error(result.error.message);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bedrijfsnaam</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="organization"
                  autoFocus
                  placeholder="Glazenwasserij De Haan"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {formError ? (
          <p role="alert" className="text-danger text-sm">
            {formError}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? 'Bezig met aanmaken…' : 'Bedrijf aanmaken'}
        </Button>
      </form>
    </Form>
  );
}
