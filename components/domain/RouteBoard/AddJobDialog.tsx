'use client';

import { Plus } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/primitives/dialog';
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
import type { CommandCustomerResult } from '@/lib/command/types';
import type { ActionResult } from '@/lib/errors';
import type { ManualJobInput } from '@/lib/validation/manual-job';
import { manualJobSchema } from '@/lib/validation/manual-job';

interface EmployeeOption {
  id: string;
  name: string;
}

interface ServiceOption {
  id: string;
  name: string;
}

interface ObjectOption {
  objectId: string;
  addressLabel: string;
  agreements: { id: string; serviceId: string; serviceName: string }[];
}

export type SearchCustomersAction = (query: string) => Promise<CommandCustomerResult[]>;
export type GetCustomerObjectsAction = (customerId: string) => Promise<ObjectOption[]>;
export type AddManualJobAction = (
  input: unknown,
) => Promise<ActionResult<{ jobId: string; unplaceable: boolean }>>;

interface AddJobDialogProps {
  /** Standaard-datum (huidige boardweergave); planner kan dit nog aanpassen. */
  date: string;
  employees: EmployeeOption[];
  services: ServiceOption[];
  searchCustomersAction: SearchCustomersAction;
  getCustomerObjectsAction: GetCustomerObjectsAction;
  addManualJobAction: AddManualJobAction;
}

const NEW_AGREEMENT = '__new__';

/** BR-101-referentie: standaard BTW-tarief voor een nieuwe eenmalige afspraak (18_Prijsafspraken.md). */
const DEFAULT_VAT_RATE = 21;

/**
 * AddJobDialog — FR-029: handmatige beurt-toevoeging op dag/tijdstip. Klant
 * zoeken → object → bestaande dienstafspraak of inline nieuwe eenmalige →
 * datum/tijdstip/medewerker/toelichting → `addManualJobAction`. Bewust géén
 * react-hook-form (de klant/object-stap is async-geladen en sequentieel, dat
 * past minder goed bij RHF's statische defaultValues) — validatie gebeurt via
 * hetzelfde zod-schema als de server (`manualJobSchema`), vlak vóór verzenden.
 */
export function AddJobDialog({
  date,
  employees,
  services,
  searchCustomersAction,
  getCustomerObjectsAction,
  addManualJobAction,
}: AddJobDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<CommandCustomerResult[]>([]);
  const [customer, setCustomer] = useState<CommandCustomerResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [objectOptions, setObjectOptions] = useState<ObjectOption[]>([]);
  const [objectId, setObjectId] = useState('');
  const [agreementChoice, setAgreementChoice] = useState('');

  const [newServiceId, setNewServiceId] = useState('');
  const [pricingType, setPricingType] = useState<'per_job' | 'hourly'>('per_job');
  const [amountEuros, setAmountEuros] = useState('');
  const [hourlyRateEuros, setHourlyRateEuros] = useState('');

  const [scheduledDate, setScheduledDate] = useState(date);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [employeeId, setEmployeeId] = useState('');
  const [note, setNote] = useState('');

  function resetForm() {
    setQuery('');
    setCustomerResults([]);
    setCustomer(null);
    setObjectOptions([]);
    setObjectId('');
    setAgreementChoice('');
    setNewServiceId('');
    setPricingType('per_job');
    setAmountEuros('');
    setHourlyRateEuros('');
    setScheduledDate(date);
    setScheduledTime('09:00');
    setEmployeeId('');
    setNote('');
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (customer) return; // klant al gekozen; niet opnieuw zoeken op de eigen naam
    debounceRef.current = setTimeout(() => {
      if (query.trim().length < 2) {
        setCustomerResults([]);
        return;
      }
      startTransition(async () => {
        setCustomerResults(await searchCustomersAction(query));
      });
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, customer, searchCustomersAction]);

  function selectCustomer(selected: CommandCustomerResult) {
    setCustomer(selected);
    setQuery(selected.name);
    setCustomerResults([]);
    setObjectId('');
    setAgreementChoice('');
    startTransition(async () => {
      setObjectOptions(await getCustomerObjectsAction(selected.id));
    });
  }

  const selectedObject = objectOptions.find((option) => option.objectId === objectId) ?? null;
  const isNewAgreement = agreementChoice === NEW_AGREEMENT;

  function buildPayload(): ManualJobInput {
    return {
      objectId,
      serviceAgreementId: isNewAgreement ? null : agreementChoice || null,
      newService: isNewAgreement
        ? {
            serviceId: newServiceId,
            pricingType,
            amountEuros:
              pricingType === 'per_job' && amountEuros !== '' ? Number(amountEuros) : undefined,
            hourlyRateEuros:
              pricingType === 'hourly' && hourlyRateEuros !== ''
                ? Number(hourlyRateEuros)
                : undefined,
            vatRate: DEFAULT_VAT_RATE,
          }
        : null,
      employeeId,
      scheduledDate,
      scheduledTime,
      note,
    };
  }

  function handleSubmit() {
    const parsed = manualJobSchema.safeParse(buildPayload());
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Controleer de ingevulde gegevens.');
      return;
    }
    startTransition(async () => {
      const result = await addManualJobAction(parsed.data);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      if (result.data.unplaceable) {
        toast.warning(
          'Beurt is aangemaakt, maar past niet meer op deze dag (te vol). Verplaats handmatig of kies een andere dag.',
        );
      } else {
        toast.success('Beurt toegevoegd');
      }
      setOpen(false);
      resetForm();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="size-4" />
          Beurt toevoegen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Beurt toevoegen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="add-job-customer">Klant</Label>
            <Input
              id="add-job-customer"
              placeholder="Zoek op klantnaam…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (customer) setCustomer(null);
              }}
              autoComplete="off"
            />
            {customerResults.length > 0 ? (
              <div className="border-border divide-border max-h-40 divide-y overflow-y-auto rounded-md border">
                {customerResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className="hover:bg-surface w-full px-3 py-2 text-left text-sm"
                    onClick={() => selectCustomer(result)}
                  >
                    {result.name}
                    {result.city ? <span className="text-text-muted"> — {result.city}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {customer ? (
            <div className="space-y-1.5">
              <Label>Object</Label>
              <Select
                value={objectId}
                onValueChange={(value) => {
                  setObjectId(value);
                  setAgreementChoice('');
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Kies een object" />
                </SelectTrigger>
                <SelectContent>
                  {objectOptions.map((option) => (
                    <SelectItem key={option.objectId} value={option.objectId}>
                      {option.addressLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {selectedObject ? (
            <div className="space-y-1.5">
              <Label>Dienstafspraak</Label>
              <Select value={agreementChoice} onValueChange={setAgreementChoice}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Kies een dienstafspraak" />
                </SelectTrigger>
                <SelectContent>
                  {selectedObject.agreements.map((agreement) => (
                    <SelectItem key={agreement.id} value={agreement.id}>
                      {agreement.serviceName}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_AGREEMENT}>+ Nieuwe eenmalige afspraak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {isNewAgreement ? (
            <div className="border-border space-y-3 rounded-md border p-3">
              <div className="space-y-1.5">
                <Label>Dienst</Label>
                <Select value={newServiceId} onValueChange={setNewServiceId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Kies een dienst" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Prijstype</Label>
                <Select
                  value={pricingType}
                  onValueChange={(value) => setPricingType(value as 'per_job' | 'hourly')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_job">Vast bedrag per beurt</SelectItem>
                    <SelectItem value="hourly">Uurtarief</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {pricingType === 'per_job' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="add-job-amount">Bedrag per beurt (€, excl. BTW)</Label>
                  <Input
                    id="add-job-amount"
                    type="number"
                    min={0}
                    step={0.01}
                    value={amountEuros}
                    onChange={(e) => setAmountEuros(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="add-job-hourly">Uurtarief (€, excl. BTW)</Label>
                  <Input
                    id="add-job-hourly"
                    type="number"
                    min={0}
                    step={0.01}
                    value={hourlyRateEuros}
                    onChange={(e) => setHourlyRateEuros(e.target.value)}
                  />
                </div>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-job-date">Datum</Label>
              <Input
                id="add-job-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-job-time">Tijdstip</Label>
              <Input
                id="add-job-time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Medewerker</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Kies een medewerker" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-job-note">Toelichting</Label>
            <Textarea
              id="add-job-note"
              placeholder='Bijv. "Klant alleen dinsdag 14:00 bereikbaar"'
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Bezig met opslaan…' : 'Beurt toevoegen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
