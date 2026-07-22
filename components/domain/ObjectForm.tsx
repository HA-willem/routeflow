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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives/select';
import { Textarea } from '@/components/primitives/textarea';
import { OBJECT_TYPE_LABEL } from '@/lib/labels';
import { resolveRedirectPath } from '@/lib/utils';
import { objectSchema, type ObjectInput } from '@/lib/validation/object';

interface ObjectFormProps {
  defaultValues?: Partial<ObjectInput>;
  onSubmit: (
    values: ObjectInput,
  ) => Promise<
    { success: true; data: { id: string } | null } | { success: false; error: { message: string } }
  >;
  submitLabel: string;
  /** Plain pad, evt. met een `:id`-placeholder (zie lib/utils.ts resolveRedirectPath). */
  redirectTo: string;
  /**
   * Als gezet: navigeert het formulier niet zelf weg maar geeft het nieuwe
   * id door aan de aanroeper (gebruikt door NieuweKlantWizard om zonder
   * paginanavigatie naar de volgende stap te gaan). Zonder deze prop blijft
   * het bestaande gedrag (navigeren naar `redirectTo`) ongewijzigd.
   */
  onSuccess?: (id: string | null) => void;
}

const DEFAULT_VALUES: ObjectInput = {
  addressLine1: '',
  addressLine2: undefined,
  postalCode: '',
  city: '',
  countryCode: 'NL',
  type: 'residence',
  accessNotes: undefined,
};

/** ObjectForm — FR-002/FR-003. Adres-only (PRD § 19 A-10, geen geocoding dit sprint). */
export function ObjectForm({
  defaultValues,
  onSubmit,
  submitLabel,
  redirectTo,
  onSuccess,
}: ObjectFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ObjectInput>({
    resolver: zodResolver(objectSchema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  function handleSubmit(values: ObjectInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Object opgeslagen');
      if (onSuccess) {
        onSuccess(result.data?.id ?? null);
        return;
      }
      router.push(resolveRedirectPath(redirectTo, result.data?.id ?? null));
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-xl space-y-4" noValidate>
        <FormField
          control={form.control}
          name="addressLine1"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Adres</FormLabel>
              <FormControl>
                <Input type="text" placeholder="Kerkstraat 42" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="addressLine2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Toevoeging (optioneel)</FormLabel>
              <FormControl>
                <Input type="text" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Postcode</FormLabel>
              <FormControl>
                <Input type="text" placeholder="1234 AB" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plaats</FormLabel>
              <FormControl>
                <Input type="text" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Objecttype</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(OBJECT_TYPE_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accessNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Toegangsinstructies (optioneel)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="3x bellen, deur rechts…"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Bezig met opslaan…' : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
