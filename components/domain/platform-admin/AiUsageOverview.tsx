'use client';

import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/primitives/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/primitives/select';
import type { CompanyAiUsage } from '@/lib/platform-admin/queries';

const ALL_COMPANIES = 'alle';

interface AiUsageOverviewProps {
  usage: CompanyAiUsage[];
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(amount < 1 ? 4 : 2)}`;
}

/**
 * AiUsageOverview — ADR-014, tokengebruik per bedrijf voor het platform-admin
 * kostendashboard. Filter is client-side (geen server-roundtrip): het datavolume
 * is één rij per bedrijf, aggregatie gebeurt al server-side in getAiUsageOverview.
 */
export function AiUsageOverview({ usage }: AiUsageOverviewProps) {
  const [companyFilter, setCompanyFilter] = useState<string>(ALL_COMPANIES);

  const filtered = useMemo(
    () =>
      companyFilter === ALL_COMPANIES ? usage : usage.filter((u) => u.companyId === companyFilter),
    [usage, companyFilter],
  );

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, row) => ({
          calls: acc.calls + row.totalCalls,
          inputTokens: acc.inputTokens + row.totalInputTokens,
          outputTokens: acc.outputTokens + row.totalOutputTokens,
          costUsd: acc.costUsd + row.totalCostUsd,
        }),
        { calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 },
      ),
    [filtered],
  );

  if (usage.length === 0) {
    return (
      <EmptyState
        title="Nog geen AI-tokengebruik."
        description="Zodra de Command Bar-AI (ADR-014) wordt gebruikt, verschijnt hier per bedrijf het verbruik."
      />
    );
  }

  return (
    <div className="space-y-3">
      <Select value={companyFilter} onValueChange={setCompanyFilter}>
        <SelectTrigger size="sm" className="w-64">
          <SelectValue placeholder="Alle bedrijven" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_COMPANIES}>Alle bedrijven</SelectItem>
          {usage.map((row) => (
            <SelectItem key={row.companyId} value={row.companyId}>
              {row.companyName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border-border rounded-md border p-3">
          <p className="text-text-muted text-xs">Aanroepen</p>
          <p className="text-text text-lg font-semibold">{totals.calls}</p>
        </div>
        <div className="border-border rounded-md border p-3">
          <p className="text-text-muted text-xs">Input-tokens</p>
          <p className="text-text text-lg font-semibold">
            {totals.inputTokens.toLocaleString('nl-NL')}
          </p>
        </div>
        <div className="border-border rounded-md border p-3">
          <p className="text-text-muted text-xs">Output-tokens</p>
          <p className="text-text text-lg font-semibold">
            {totals.outputTokens.toLocaleString('nl-NL')}
          </p>
        </div>
        <div className="border-border rounded-md border p-3">
          <p className="text-text-muted text-xs">Geschatte kosten</p>
          <p className="text-text text-lg font-semibold">{formatUsd(totals.costUsd)}</p>
        </div>
      </div>

      <div className="border-border overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Bedrijf</th>
              <th className="px-4 py-3 font-medium">Aanroepen</th>
              <th className="px-4 py-3 font-medium">Input-tokens</th>
              <th className="px-4 py-3 font-medium">Output-tokens</th>
              <th className="px-4 py-3 font-medium">Kosten</th>
              <th className="px-4 py-3 font-medium">Laatst gebruikt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.companyId} className="border-border border-t">
                <td className="px-4 py-3">{row.companyName}</td>
                <td className="px-4 py-3">{row.totalCalls}</td>
                <td className="px-4 py-3">{row.totalInputTokens.toLocaleString('nl-NL')}</td>
                <td className="px-4 py-3">{row.totalOutputTokens.toLocaleString('nl-NL')}</td>
                <td className="px-4 py-3">{formatUsd(row.totalCostUsd)}</td>
                <td className="px-4 py-3">{new Date(row.lastUsedAt).toLocaleString('nl-NL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
