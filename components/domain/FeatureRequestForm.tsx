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
import { Textarea } from '@/components/primitives/textarea';
import { featureRequestSchema, type FeatureRequestInput } from '@/lib/validation/feature-request';

interface FeatureRequestFormProps {
  onSubmit: (
    values: FeatureRequestInput,
  ) => Promise<
    { success: true; data: { id: string } | null } | { success: false; error: { message: string } }
  >;
  redirectTo: string;
}

const DEFAULT_VALUES: FeatureRequestInput = {
  title: '',
  description: '',
  context: undefined,
};

/** FeatureRequestForm — 46_PlatformAdmin.md § 2.1, FR-950. */
export function FeatureRequestForm({ onSubmit, redirectTo }: FeatureRequestFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FeatureRequestInput>({
    resolver: zodResolver(featureRequestSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function handleSubmit(values: FeatureRequestInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Feature request ingediend');
      router.push(redirectTo);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-xl space-y-4" noValidate>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titel</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Bijv. Herinnering per WhatsApp i.p.v. e-mail"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Omschrijving</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Wat wil je kunnen doen, en waarom helpt dat je?"
                  rows={5}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="context"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Context (optioneel)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="Bijv. welke pagina of situatie dit betreft"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Bezig met indienen…' : 'Feature request indienen'}
        </Button>
      </form>
    </Form>
  );
}
