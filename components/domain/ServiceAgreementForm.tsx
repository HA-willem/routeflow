'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/primitives/button';
import { Checkbox } from '@/components/primitives/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/primitives/dialog';
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
import type { ActionResult } from '@/lib/errors';
import { FREQUENCY_LABEL } from '@/lib/labels';
import { resolveRedirectPath } from '@/lib/utils';
import type { ServiceInput } from '@/lib/validation/service';
import {
  serviceAgreementSchema,
  type ServiceAgreementInput,
} from '@/lib/validation/service-agreement';

import { ServiceForm } from './ServiceForm';

interface ServiceOption {
  id: string;
  name: string;
}

interface ServiceAgreementFormProps {
  services: ServiceOption[];
  /**
   * Maakt "+ Nieuwe dienst" mogelijk vanuit de Dienst-keuze zelf, zonder deze
   * pagina te verlaten (gebruiker moest anders naar Instellingen → Diensten).
   * Hergebruikt het bestaande ServiceForm/createService-pad ongewijzigd.
   */
  createServiceAction: (input: unknown) => Promise<ActionResult<{ id: string }>>;
  defaultValues?: Partial<ServiceAgreementInput>;
  onSubmit: (
    values: ServiceAgreementInput,
  ) => Promise<
    { success: true; data: { id: string } | null } | { success: false; error: { message: string } }
  >;
  submitLabel: string;
  /** Plain pad, evt. met een `:id`-placeholder (zie lib/utils.ts resolveRedirectPath). */
  redirectTo: string;
}

const DEFAULT_VALUES: ServiceAgreementInput = {
  serviceId: '',
  frequencyType: 'weekly',
  customIntervalDays: undefined,
  preferredDay: null,
  preferredDaypart: null,
  flexibilityWindowDays: 3,
  callAheadRequired: false,
  pricingType: 'per_job',
  amountEuros: undefined,
  hourlyRateEuros: undefined,
  subscriptionAmountEuros: undefined,
  includedJobsPerPeriod: undefined,
  overageAmountEuros: undefined,
  billingTiming: undefined,
  vatRate: 21,
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

/** Radix Select staat geen lege string als item-waarde toe; dit is de "geen voorkeur"-sentinel. */
const NO_PREFERENCE = 'none';

function formatEuros(amount: number): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount);
}

/**
 * ServiceAgreementForm — FR-004. Combineert dienst, frequentie en prijsafspraak
 * in één formulier (26_ComponentLibrary.md § 4: ServiceAgreementForm +
 * PricingForm horen samen bij de dienstafspraak).
 */
export function ServiceAgreementForm({
  services,
  createServiceAction,
  defaultValues,
  onSubmit,
  submitLabel,
  redirectTo,
}: ServiceAgreementFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>(services);
  const [isNewServiceOpen, setIsNewServiceOpen] = useState(false);

  const form = useForm<ServiceAgreementInput>({
    resolver: zodResolver(serviceAgreementSchema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  const frequencyType = useWatch({ control: form.control, name: 'frequencyType' });
  const pricingType = useWatch({ control: form.control, name: 'pricingType' });
  const amountEuros = useWatch({ control: form.control, name: 'amountEuros' });
  const hourlyRateEuros = useWatch({ control: form.control, name: 'hourlyRateEuros' });
  const subscriptionAmountEuros = useWatch({
    control: form.control,
    name: 'subscriptionAmountEuros',
  });
  const vatRate = useWatch({ control: form.control, name: 'vatRate' });

  // Vangt de naam van de zojuist ingevulde dienst op (createServiceAction
  // krijgt alleen `unknown` binnen, geen typed callback) zodat de nieuwe
  // dienst meteen met een echte naam in de Dienst-select verschijnt i.p.v.
  // een lege/placeholder-rij tot de volgende paginaherlaad.
  const pendingServiceNameRef = useRef('');

  function handleCreateService(values: ServiceInput) {
    pendingServiceNameRef.current = values.name;
    return createServiceAction(values);
  }

  function handleSubmit(values: ServiceAgreementInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Dienstafspraak opgeslagen');
      router.push(resolveRedirectPath(redirectTo, result.data?.id ?? null));
    });
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-xl space-y-4" noValidate>
          <FormField
            control={form.control}
            name="serviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dienst</FormLabel>
                <div className="flex gap-2">
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      // Radix Select roept onValueChange soms ongevraagd aan met
                      // een lege string wanneer de items-lijst wijzigt terwijl er
                      // al een waarde geselecteerd is (hier: net na het toevoegen
                      // van een nieuwe dienst) — dienst-id's zijn nooit leeg, dus
                      // dit is altijd een vals signaal, geen echte gebruikersactie.
                      if (value) field.onChange(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Kies een dienst" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceOptions.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Nieuwe dienst toevoegen"
                    onClick={() => setIsNewServiceOpen(true)}
                  >
                    <PlusIcon />
                  </Button>
                </div>
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
                  <FormLabel>Aangepaste frequentie (weken)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={52}
                      placeholder="bijv. 8 of 12"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={field.value !== undefined ? field.value / 7 : ''}
                      onChange={(e) => field.onChange(Math.round(e.target.valueAsNumber * 7))}
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
                  value={
                    field.value !== null && field.value !== undefined
                      ? String(field.value)
                      : NO_PREFERENCE
                  }
                  onValueChange={(value) =>
                    field.onChange(value === NO_PREFERENCE ? null : Number(value))
                  }
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Geen voorkeur" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_PREFERENCE}>Geen voorkeur</SelectItem>
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
                <Select
                  value={field.value ?? NO_PREFERENCE}
                  onValueChange={(value) => field.onChange(value === NO_PREFERENCE ? null : value)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Geen voorkeur" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NO_PREFERENCE}>Geen voorkeur</SelectItem>
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
                    <SelectItem value="subscription">Abonnement</SelectItem>
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
                  {amountEuros !== undefined && !Number.isNaN(amountEuros) ? (
                    <p className="text-text-muted text-xs">
                      {formatEuros(amountEuros * (1 + vatRate / 100))} incl. BTW
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {pricingType === 'hourly' ? (
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
                  {hourlyRateEuros !== undefined && !Number.isNaN(hourlyRateEuros) ? (
                    <p className="text-text-muted text-xs">
                      {formatEuros(hourlyRateEuros * (1 + vatRate / 100))}/u incl. BTW
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {pricingType === 'subscription' ? (
            <>
              <FormField
                control={form.control}
                name="subscriptionAmountEuros"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrag per maand (€, excl. BTW)</FormLabel>
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
                    {subscriptionAmountEuros !== undefined &&
                    !Number.isNaN(subscriptionAmountEuros) ? (
                      <p className="text-text-muted text-xs">
                        {formatEuros(subscriptionAmountEuros * (1 + vatRate / 100))}/maand incl. BTW
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="includedJobsPerPeriod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inbegrepen beurten per maand (0 = ongelimiteerd)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
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

              <FormField
                control={form.control}
                name="overageAmountEuros"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Bedrag per extra beurt boven het abonnement (€, excl. BTW)
                    </FormLabel>
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

              <FormField
                control={form.control}
                name="billingTiming"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Facturatiemoment</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Kies vooraf of achteraf" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="advance">Vooraf</SelectItem>
                        <SelectItem value="arrears">Achteraf</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : null}

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

      <Dialog open={isNewServiceOpen} onOpenChange={setIsNewServiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe dienst</DialogTitle>
          </DialogHeader>
          <ServiceForm
            submitLabel="Dienst aanmaken"
            onSubmit={handleCreateService}
            redirectTo=""
            onSuccess={(id) => {
              if (!id) return;
              setServiceOptions((current) => [
                ...current,
                { id, name: pendingServiceNameRef.current },
              ]);
              form.setValue('serviceId', id, { shouldDirty: true });
              setIsNewServiceOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
