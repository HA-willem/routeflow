'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/primitives/button';
import { Checkbox } from '@/components/primitives/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/primitives/form';
import { Input } from '@/components/primitives/input';
import { Label } from '@/components/primitives/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives/select';
import { Textarea } from '@/components/primitives/textarea';
import { resolveRedirectPath } from '@/lib/utils';
import { customerSchema, type CustomerInput } from '@/lib/validation/customer';

interface CustomerFormProps {
  defaultValues?: Partial<CustomerInput>;
  onSubmit: (
    values: CustomerInput,
  ) => Promise<
    { success: true; data: { id: string } | null } | { success: false; error: { message: string } }
  >;
  submitLabel: string;
  /** Plain pad, evt. met een `:id`-placeholder (zie lib/utils.ts resolveRedirectPath). */
  redirectTo: string;
}

const DEFAULT_VALUES: CustomerInput = {
  name: '',
  type: 'person',
  email: undefined,
  phone: undefined,
  whatsappNumber: undefined,
  whatsappOptIn: false,
  emailOptIn: true,
  billingPreference: 'email',
  kvkNumber: undefined,
  vatNumber: undefined,
  paymentTermsDays: 14,
  notes: undefined,
};

/**
 * CustomerForm — FR-001. Gedeeld tussen aanmaken en bewerken (§ 4
 * componentconventies); het KVK-veld verschijnt alleen bij `type=business`
 * (FR-001 edge case).
 */
export function CustomerForm({
  defaultValues,
  onSubmit,
  submitLabel,
  redirectTo,
}: CustomerFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  const isBusiness = useWatch({ control: form.control, name: 'type' }) === 'business';

  function handleSubmit(values: CustomerInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Klant opgeslagen');
      router.push(resolveRedirectPath(redirectTo, result.data?.id ?? null));
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-xl space-y-4" noValidate>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Naam</FormLabel>
              <FormControl>
                <Input type="text" autoComplete="name" {...field} />
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
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="person">Particulier</SelectItem>
                  <SelectItem value="business">Zakelijk</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {isBusiness ? (
          <FormField
            control={form.control}
            name="kvkNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>KVK-nummer</FormLabel>
                <FormControl>
                  <Input type="text" inputMode="numeric" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        {isBusiness ? (
          <FormField
            control={form.control}
            name="vatNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BTW-nummer (optioneel)</FormLabel>
                <FormControl>
                  <Input type="text" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mailadres (optioneel)</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} value={field.value ?? ''} />
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
              <FormLabel>Telefoonnummer (optioneel)</FormLabel>
              <FormControl>
                <Input type="tel" autoComplete="tel" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="whatsappNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp-nummer (optioneel)</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="06..." {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="whatsappOptIn"
          render={({ field }) => (
            <FormItem>
              <Label className="flex items-center gap-2">
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                Klant geeft toestemming voor WhatsApp-berichten
              </Label>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="emailOptIn"
          render={({ field }) => (
            <FormItem>
              <Label className="flex items-center gap-2">
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                Klant geeft toestemming voor e-mailberichten
              </Label>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="billingPreference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Facturatievoorkeur</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="post">Post</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentTermsDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Betaaltermijn (dagen)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notities (optioneel)</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ''} />
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
