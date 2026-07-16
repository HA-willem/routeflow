import { EmptyState } from '@/components/primitives/empty-state';
import type { CompanyAgentHealth } from '@/lib/platform-admin/queries';

interface OperationalOverviewProps {
  companies: CompanyAgentHealth[];
}

/**
 * OperationalOverview — FR-953, 46_PlatformAdmin.md § 1.3. Cross-tenant
 * agent-rungezondheid, laatste 7 dagen. Bedoeld om problemen (zoals de
 * verlopen service-role-secret, 2026-07-15) proactief te signaleren i.p.v.
 * pas bij een tenant-melding.
 */
export function OperationalOverview({ companies }: OperationalOverviewProps) {
  if (companies.length === 0) {
    return (
      <EmptyState
        title="Nog geen agent-runs in de laatste 7 dagen."
        description="Zodra de nachtcyclus draait, verschijnt hier per bedrijf de rungezondheid."
      />
    );
  }

  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Bedrijf</th>
            <th className="px-4 py-3 font-medium">Runs (7d)</th>
            <th className="px-4 py-3 font-medium">Mislukt</th>
            <th className="px-4 py-3 font-medium">Laatste run</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.companyId} className="border-border border-t">
              <td className="px-4 py-3">{company.companyName}</td>
              <td className="px-4 py-3">{company.totalRuns}</td>
              <td
                className={`px-4 py-3 ${company.failedRuns > 0 ? 'text-warning font-medium' : ''}`}
              >
                {company.failedRuns}
              </td>
              <td className="px-4 py-3">{new Date(company.lastRunAt).toLocaleString('nl-NL')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
