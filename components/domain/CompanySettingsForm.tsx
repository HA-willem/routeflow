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
import { Label } from '@/components/primitives/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives/select';
import { Switch } from '@/components/primitives/switch';
import { INDUSTRIES } from '@/lib/branche-templates/data';
import {
  companySettingsSchema,
  type CompanySettingsInput,
} from '@/lib/validation/company-settings';

interface CompanySettingsFormProps {
  defaultValues: CompanySettingsInput;
  onSubmit: (
    values: CompanySettingsInput,
  ) => Promise<{ success: true; data: null } | { success: false; error: { message: string } }>;
}

/** CompanySettingsForm — FR-100, Bedrijfsinstellingen. */
export function CompanySettingsForm({ defaultValues, onSubmit }: CompanySettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<CompanySettingsInput>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues,
  });

  function handleSubmit(values: CompanySettingsInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Instellingen opgeslagen');
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-xl space-y-6" noValidate>
        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Bedrijf</h2>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bedrijfsnaam</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="companyType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bedrijfstype</FormLabel>
                <p className="text-text-muted text-xs">
                  Stuurt alleen standaardwaarden (zoals hieronder), nooit welke onderdelen van
                  ServOps je te zien krijgt.
                </p>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Kies je bedrijfstype" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="zzp">ZZP&apos;er</SelectItem>
                    <SelectItem value="mkb">MKB (meerdere medewerkers)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="industry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branche</FormLabel>
                <Select value={field.value ?? ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Kies je branche" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry.id} value={industry.id}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold">Facturatie</h2>
          <FormField
            control={form.control}
            name="companyCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bedrijfscode (voor factuurnummering)</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="kvkNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>KVK-nummer</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="vatNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BTW-nummer</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="iban"
            render={({ field }) => (
              <FormItem>
                <FormLabel>IBAN</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="bic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>BIC</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="instantInvoiceOnComplete"
            render={({ field }) => (
              <FormItem>
                <Label className="flex items-center gap-3">
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                  Factuur direct versturen na afronden beurt
                </Label>
                <p className="text-text-muted text-xs">
                  Voor ZZP&apos;ers die zelf uitvoeren én factureren: bespaart een tweede stap. Bij
                  meerdere medewerkers raden we dit uit staan aan (financiële scheiding tussen
                  uitvoering en administratie).
                </p>
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Bezig met opslaan…' : 'Opslaan'}
        </Button>
      </form>
    </Form>
  );
}
