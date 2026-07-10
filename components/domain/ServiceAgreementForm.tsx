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
import {
  serviceAgreementSchema,
  type ServiceAgreementInput,
} from '@/lib/validation/service-agreement';

interface ServiceOption {
  id: string;
  name: string;
}

interface ServiceAgreementFormProps {
  services: ServiceOption[];
  defaultValues?: Partial<ServiceAgreementInput>;
  onSubmit: (
    values: ServiceAgreementInput,
  ) => Promise<
    { success: true; data: { id: string } | null } | { success: false; error: { message: string } }
  >;
  submitLabel: string;
  redirectTo: (id: string | null) => string;
}

const DEFAULT_VALUES: ServiceAgreementInput = {
  serviceId: '',
  frequencyType: 'weekly',
  customIntervalDays: undefined,
  preferredDay: undefined,
  preferredDaypart: undefined,
  flexibilityWindowDays: 3,
  callAheadRequired: false,
  pricingType: 'per_job',
  amountEuros: undefined,
  hourlyRateEuros: undefined,
  vatRate: 21,
};

const FREQUENCY_LABEL: Record<ServiceAgreementInput['frequencyType'], string> = {
  weekly: 'Wekelijks',
  biweekly: 'Elke 2 weken',
  monthly: 'Maandelijks',
  quarterly: 'Elk kwartaal',
  yearly: 'Jaarlijks',
  once: 'Eenmalig',
  custom: 'Aangepast',
};

const WEEKDAY_LABEL = [
  'Maandag',
  'Dinsdag',
  'Woensdag',
  'Donderdag',
  'Vrijdag',
  'Zaterdag',
  'Zondag',
];

/**
 * ServiceAgreementForm — FR-004. Combineert dienst, frequentie en prijsafspraak
 * in één formulier (26_ComponentLibrary.md § 4: ServiceAgreementForm +
 * PricingForm horen samen bij de dienstafspraak).
 */
export function ServiceAgreementForm({
  services,
  defaultValues,
  onSubmit,
  submitLabel,
  redirectTo,
}: ServiceAgreementFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ServiceAgreementInput>({
    resolver: zodResolver(serviceAgreementSchema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  const frequencyType = useWatch({ control: form.control, name: 'frequencyType' });
  const pricingType = useWatch({ control: form.control, name: 'pricingType' });

  function handleSubmit(values: ServiceAgreementInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Dienstafspraak opgeslagen');
      router.push(redirectTo(result.data?.id ?? null));
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-xl space-y-4" noValidate>
        <FormField
          control={form.control}
          name="serviceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dienst</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kies een dienst" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
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
          name="frequencyType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequentie</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABEL).map(([value, label]) => (
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

        {frequencyType === 'custom' ? (
          <FormField
            control={form.control}
            name="customIntervalDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aangepaste frequentie (dagen)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={7}
                    max={365}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="preferredDay"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Voorkeursdag (optioneel)</FormLabel>
              <Select
                value={field.value !== undefined ? String(field.value) : undefined}
                onValueChange={(value) => field.onChange(Number(value))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Geen voorkeur" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {WEEKDAY_LABEL.map((label, index) => (
                    <SelectItem key={label} value={String(index)}>
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
          name="preferredDaypart"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Voorkeursdagdeel (optioneel)</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Geen voorkeur" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="morning">Ochtend</SelectItem>
                  <SelectItem value="afternoon">Middag</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="flexibilityWindowDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Flexibiliteitsvenster (werkdagen ±)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={21}
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
          name="callAheadRequired"
          render={({ field }) => (
            <FormItem>
              <Label className="flex items-center gap-2">
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                Bel vooraf
              </Label>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pricingType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prijstype</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="per_job">Vast bedrag per beurt</SelectItem>
                  <SelectItem value="hourly">Uurtarief</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {pricingType === 'per_job' ? (
          <FormField
            control={form.control}
            name="amountEuros"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bedrag per beurt (€, excl. BTW)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="hourlyRateEuros"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Uurtarief (€, excl. BTW)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="vatRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>BTW-tarief</FormLabel>
              <Select
                value={String(field.value)}
                onValueChange={(value) => field.onChange(Number(value))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="21">21%</SelectItem>
                  <SelectItem value="9">9%</SelectItem>
                  <SelectItem value="0">0%</SelectItem>
                </SelectContent>
              </Select>
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
