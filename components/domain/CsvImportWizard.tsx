'use client';

import { Download, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/composed/PageHeader';
import { Button } from '@/components/primitives/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives/select';
import type { ActionResult } from '@/lib/errors';
import { IMPORT_TARGET_FIELDS } from '@/lib/import/csv';
import type {
  ImportRowInput,
  ImportRowValidated,
  ImportSummary,
  ImportTargetField,
} from '@/lib/import/csv';

type Step = 'upload' | 'mapping' | 'rapport' | 'klaar';

const STEP_LABEL: Record<Step, string> = {
  upload: 'Stap 1 van 4 — CSV-bestand kiezen',
  mapping: 'Stap 2 van 4 — Kolommen koppelen',
  rapport: 'Stap 3 van 4 — Controleren',
  klaar: 'Stap 4 van 4 — Klaar',
};

const NONE = 'geen';

interface CsvImportWizardProps {
  validateAction: (
    rows: ImportRowInput[],
  ) => Promise<ActionResult<{ results: ImportRowValidated[]; summary: ImportSummary }>>;
  commitAction: (rows: ImportRowValidated[]) => Promise<
    ActionResult<{
      importJobId: string;
      successCount: number;
      errorCount: number;
      errorLog: { row: number; message: string }[];
    }>
  >;
}

function downloadErrorLog(errorLog: { row: number; message: string }[]) {
  const content = JSON.stringify(errorLog, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'import-foutlog.json';
  link.click();
  URL.revokeObjectURL(url);
}

/** Voorbeeldbestand — kolomkoppen + één voorbeeldrij, zodat een gebruiker niet hoeft te raden. */
function downloadExampleCsv() {
  const headerRow = IMPORT_TARGET_FIELDS.map((field) => field.label).join(',');
  const exampleRow = [
    'Bakkerij Jansen',
    'info@bakkerijjansen.nl',
    '0612345678',
    '',
    'Kerkstraat 12',
    '1234 AB',
    'Amsterdam',
  ].join(',');
  const blob = new Blob([`${headerRow}\n${exampleRow}\n`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'voorbeeld-klanten-import.csv';
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * CsvImportWizard — FR-006. Stap-shell-patroon van NieuweKlantWizard.tsx,
 * maar met eigen stappen (upload/mapping/rapport/klaar) — er bestaat nog geen
 * batch-import-stap om te hergebruiken. CSV-parsing gebeurt client-side
 * (papaparse); validatie + geocoding gebeurt server-side (Mapbox-token/DB-
 * toegang horen niet in de browser).
 */
export function CsvImportWizard({ validateAction, commitAction }: CsvImportWizardProps) {
  const [step, setStep] = useState<Step>('upload');
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<ImportTargetField, string>>>({});

  const [validated, setValidated] = useState<ImportRowValidated[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const [commitResult, setCommitResult] = useState<{
    successCount: number;
    errorCount: number;
    errorLog: { row: number; message: string }[];
  } | null>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.data.length === 0) {
          toast.error('Geen rijen gevonden in dit bestand.');
          return;
        }
        setHeaders(result.meta.fields ?? []);
        setRawRows(result.data);
        setStep('mapping');
      },
      error: (error) => {
        toast.error(`Bestand kon niet gelezen worden: ${error.message}`);
      },
    });
  }

  const requiredFieldsMapped = IMPORT_TARGET_FIELDS.filter((field) => field.required).every(
    (field) => !!mapping[field.key],
  );

  function buildImportRows(): ImportRowInput[] {
    return rawRows.map((raw, index) => ({
      rowNumber: index + 2, // rij 1 = header
      name: mapping.name ? (raw[mapping.name] ?? '').trim() : '',
      email: mapping.email ? raw[mapping.email]?.trim() || undefined : undefined,
      phone: mapping.phone ? raw[mapping.phone]?.trim() || undefined : undefined,
      kvkNumber: mapping.kvkNumber ? raw[mapping.kvkNumber]?.trim() || undefined : undefined,
      addressLine1: mapping.addressLine1 ? (raw[mapping.addressLine1] ?? '').trim() : '',
      postalCode: mapping.postalCode ? (raw[mapping.postalCode] ?? '').trim() : '',
      city: mapping.city ? (raw[mapping.city] ?? '').trim() : '',
    }));
  }

  function handleValidate() {
    startTransition(async () => {
      const result = await validateAction(buildImportRows());
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      setValidated(result.data.results);
      setSummary(result.data.summary);
      setStep('rapport');
    });
  }

  function handleCommit() {
    startTransition(async () => {
      const result = await commitAction(validated);
      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      setCommitResult(result.data);
      setStep('klaar');
    });
  }

  return (
    <div>
      <PageHeader title="Klanten importeren" description={STEP_LABEL[step]} />

      {step === 'upload' ? (
        <div className="max-w-xl space-y-4">
          <p className="text-text-muted text-sm">
            Kies een CSV-bestand met klanten en objecten. Elke rij wordt één klant + één object
            (adres) — meerdere objecten per klant in dezelfde import worden niet ondersteund.
          </p>
          <Button type="button" variant="outline" onClick={() => downloadExampleCsv()}>
            <Download className="mr-2 size-4" aria-hidden />
            Voorbeeld-CSV downloaden
          </Button>
          <div className="border-border flex items-center gap-3 rounded-md border border-dashed p-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="sr-only"
              id="csv-file-input"
            />
            <Button type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 size-4" aria-hidden />
              Bestand kiezen
            </Button>
            <span className="text-text-muted text-sm">
              {fileName ?? 'Nog geen bestand gekozen'}
            </span>
          </div>
        </div>
      ) : null}

      {step === 'mapping' ? (
        <div className="max-w-xl space-y-4">
          <p className="text-text-muted text-sm">
            {rawRows.length} rijen gevonden. Koppel elk veld aan een kolom uit het bestand.
          </p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface">
                <tr>
                  {headers.map((header) => (
                    <th key={header} className="px-2 py-1 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rawRows.slice(0, 5).map((row, index) => (
                  <tr key={index} className="border-t">
                    {headers.map((header) => (
                      <td key={header} className="px-2 py-1">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            {IMPORT_TARGET_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-2">
                <span className="w-48 text-sm">
                  {field.label}
                  {field.required ? ' *' : ''}
                </span>
                <Select
                  value={mapping[field.key] ?? NONE}
                  onValueChange={(value) =>
                    setMapping((current) => ({
                      ...current,
                      [field.key]: value === NONE ? undefined : value,
                    }))
                  }
                >
                  <SelectTrigger aria-label={field.label} className="w-full">
                    <SelectValue placeholder="Kies een kolom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— niet koppelen —</SelectItem>
                    {headers.map((header) => (
                      <SelectItem key={header} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <Button onClick={handleValidate} disabled={!requiredFieldsMapped || isPending}>
            {isPending ? 'Bezig met valideren…' : 'Volgende: valideren'}
          </Button>
        </div>
      ) : null}

      {step === 'rapport' && summary ? (
        <div className="space-y-4">
          <p className="text-text text-sm">
            {summary.okCount} OK, {summary.warningCount} met waarschuwing (adres niet gevonden,
            wordt later alsnog geprobeerd), {summary.errorCount} met fout (worden niet
            geïmporteerd).
          </p>
          <div className="max-h-96 overflow-x-auto overflow-y-auto rounded-md border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface sticky top-0">
                <tr>
                  <th className="px-2 py-1 font-medium">Rij</th>
                  <th className="px-2 py-1 font-medium">Naam</th>
                  <th className="px-2 py-1 font-medium">Status</th>
                  <th className="px-2 py-1 font-medium">Toelichting</th>
                </tr>
              </thead>
              <tbody>
                {validated.map((row) => (
                  <tr key={row.rowNumber} className="border-t">
                    <td className="px-2 py-1">{row.rowNumber}</td>
                    <td className="px-2 py-1">{row.name || '—'}</td>
                    <td className="px-2 py-1">
                      {row.status === 'ok'
                        ? 'OK'
                        : row.status === 'warning'
                          ? 'Waarschuwing'
                          : 'Fout'}
                    </td>
                    <td className="px-2 py-1">{row.errors.join('; ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep('mapping')} disabled={isPending}>
              Terug
            </Button>
            <Button
              onClick={handleCommit}
              disabled={isPending || summary.okCount + summary.warningCount === 0}
            >
              {isPending ? 'Bezig met importeren…' : 'Bevestigen en importeren'}
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'klaar' && commitResult ? (
        <div className="max-w-xl space-y-4">
          <p className="text-text text-sm">
            {commitResult.successCount} klanten + objecten aangemaakt, {commitResult.errorCount}{' '}
            fouten.
          </p>
          {commitResult.errorLog.length > 0 ? (
            <Button variant="outline" onClick={() => downloadErrorLog(commitResult.errorLog)}>
              Foutlog downloaden
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
