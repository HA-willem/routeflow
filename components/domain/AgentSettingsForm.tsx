'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/primitives/button';
import { Form, FormField } from '@/components/primitives/form';
import { Input } from '@/components/primitives/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives/select';
import { AGENT_DESCRIPTION, AGENT_LABEL, AUTOMATION_LEVEL_LABEL } from '@/lib/agents/labels';
import {
  agentSettingsFormSchema,
  type AgentSettingsFormInput,
} from '@/lib/validation/agent-settings';

interface AgentSettingsFormProps {
  defaultValues: AgentSettingsFormInput;
  onSubmit: (
    values: AgentSettingsFormInput,
  ) => Promise<{ success: true; data: null } | { success: false; error: { message: string } }>;
}

/** AgentSettingsForm — "AI-assistent"-instellingen (15_AIPlanner.md § 8). */
export function AgentSettingsForm({ defaultValues, onSubmit }: AgentSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<AgentSettingsFormInput>({
    resolver: zodResolver(agentSettingsFormSchema),
    defaultValues,
  });

  function handleSubmit(values: AgentSettingsFormInput) {
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-2xl space-y-3" noValidate>
        {defaultValues.settings.map((setting, index) => (
          <div key={setting.agent} className="border-border rounded-md border p-4">
            <p className="text-text text-sm font-semibold">{AGENT_LABEL[setting.agent]}</p>
            <p className="text-text-muted mt-0.5 text-xs">{AGENT_DESCRIPTION[setting.agent]}</p>

            <div className="mt-3 flex flex-wrap items-end gap-4">
              <FormField
                control={form.control}
                name={`settings.${index}.automationLevel`}
                render={({ field }) => (
                  <div className="w-56">
                    <label className="text-text-muted text-xs font-medium">
                      Automatiseringsniveau
                    </label>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(AUTOMATION_LEVEL_LABEL).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />

              <FormField
                control={form.control}
                name={`settings.${index}.confidenceThreshold`}
                render={({ field }) => (
                  <div className="w-32">
                    <label className="text-text-muted text-xs font-medium">
                      Confidence-drempel
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      className="mt-1"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </div>
                )}
              />

              <input type="hidden" {...form.register(`settings.${index}.agent`)} />
            </div>
          </div>
        ))}

        <p className="text-text-muted text-xs">
          Bij &quot;Voorstel&quot; verschijnt elke suggestie in de Morning Briefing ter goedkeuring.
          Bij &quot;Semi-automatisch&quot;/&quot;Volautomatisch&quot; voert de agent uitvoerbare
          voorstellen zelf uit zodra de confidence-score de drempel haalt — een lagere confidence
          dan de drempel valt altijd terug op &quot;Voorstel&quot;, ongeacht het gekozen niveau.
          Acties die BR-702 raakt (facturen versturen, betalingen, prijswijzigingen) vereisen
          sowieso altijd goedkeuring.
        </p>

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Bezig met opslaan…' : 'Opslaan'}
        </Button>
      </form>
    </Form>
  );
}
