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
import { serviceSchema, type ServiceInput } from '@/lib/validation/service';

interface ServiceFormProps {
  defaultValues?: Partial<ServiceInput>;
  onSubmit: (
    values: ServiceInput,
  ) => Promise<
    { success: true; data: { id: string } | null } | { success: false; error: { message: string } }
  >;
  submitLabel: string;
  /** Plain pad, evt. met een `:id`-placeholder (zie lib/utils.ts resolveRedirectPath). */
  redirectTo: string;
}

const DEFAULT_VALUES: ServiceInput = {
  name: '',
  description: undefined,
  standardDurationMinutes: 45,
  standardPriceEuros: 0,
  vatRate: 21,
  isWeatherSensitive: false,
  weatherSensitivityType: undefined,
  icon: undefined,
  colorHex: undefined,
};

const WEATHER_SENSITIVITY_LABEL: Record<'rain' | 'frost' | 'wind', string> = {
  rain: 'Regen',
  frost: 'Vorst',
  wind: 'Wind',
};

/** ServiceForm — 17_Producten.md/12_Entiteiten.md § 5 (Diensteninstellingen). */
export function ServiceForm({
  defaultValues,
  onSubmit,
  submitLabel,
  redirectTo,
}: ServiceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ServiceInput>({
    resolver: zodResolver(serviceSchema),
    defaultValues: { ...DEFAULT_VALUES, ...defaultValues },
  });

  const isWeatherSensitive = useWatch({ control: form.control, name: 'isWeatherSensitive' });

  function handleSubmit(values: ServiceInput) {
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success('Dienst opgeslagen');
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
                <Input type="text" placeholder="Glasbewassing buiten" {...field} />
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
              <FormLabel>Omschrijving (optioneel)</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="standardDurationMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Standaardduur (minuten)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={15}
                  max={480}
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
          name="standardPriceEuros"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Standaardprijs (€, excl. BTW)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
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

        <FormField
          control={form.control}
          name="isWeatherSensitive"
          render={({ field }) => (
            <FormItem>
              <Label className="flex items-center gap-2">
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                Weersgevoelige dienst
              </Label>
            </FormItem>
          )}
        />

        {isWeatherSensitive ? (
          <FormField
            control={form.control}
            name="weatherSensitivityType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weerstype</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Kies een weerstype" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(WEATHER_SENSITIVITY_LABEL).map(([value, label]) => (
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
        ) : null}

        <FormField
          control={form.control}
          name="colorHex"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kleur (optioneel, bijv. #1A73E8)</FormLabel>
              <FormControl>
                <Input type="text" placeholder="#1A73E8" {...field} value={field.value ?? ''} />
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
