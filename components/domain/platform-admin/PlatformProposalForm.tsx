'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  platformProposalSchema,
  type PlatformProposalInput,
} from '@/lib/validation/platform-proposal';

interface PlatformProposalFormProps {
  onSubmit: (
    values: PlatformProposalInput,
  ) => Promise<
    { success: true; data: { id: string } | null } | { success: false; error: { message: string } }
  >;
}

const DEFAULT_VALUES: PlatformProposalInput = {
  title: '',
  prUrl: undefined,
  triggerSummary: '',
  riskLevel: 'normal',
  alternativesConsidered: '',
};

/**
 * PlatformProposalForm — handmatig voorstel aanmaken (Sprint 11-fundament,
 * 46_PlatformAdmin.md "Volgende stap"). Tijdelijk het enige aanmaakpad tot de
 * geplande Product Agent-run (Sprint 11-vervolg, FR-951) dit overneemt via
 * service_role.
 */
export function PlatformProposalForm({ onSubmit }: PlatformProposalFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<PlatformProposalInput>({
    resolver: zodResolver(platformProposalSchema),
    defaultValues: DEFAULT_VALUES,
  });

  function handleSubmit(values: PlatformProposalInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Voorstel aangemaakt');
      form.reset(DEFAULT_VALUES);
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
                <Input type="text" placeholder="Bijv. WhatsApp-herinnering toevoegen" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="prUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>PR-link (optioneel)</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="https://github.com/..."
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="triggerSummary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trigger / waarom</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Welke feature request(s) of welk signaal?"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="riskLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Risicoclassificatie</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="normal">Normaal</SelectItem>
                  <SelectItem value="high_risk">
                    High-risk (migraties/RLS/auth/betalingen/secrets)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="alternativesConsidered"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Overwogen alternatieven (optioneel)</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Bezig met aanmaken…' : 'Voorstel aanmaken'}
        </Button>
      </form>
    </Form>
  );
}
