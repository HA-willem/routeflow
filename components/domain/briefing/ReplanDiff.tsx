import { DataTable, type DataTableColumn } from '@/components/composed/DataTable';
import type { ActionablePayload } from '@/lib/briefing/types';

type ReplanJobsPayload = Extract<ActionablePayload, { type: 'replan_jobs' }>;

interface ReplanRow {
  jobId: string;
  customerName: string;
  van: string;
  naar: string;
}

const COLUMNS: DataTableColumn<ReplanRow>[] = [
  { header: 'Beurt', cell: (row) => row.customerName },
  { header: 'Van', cell: (row) => row.van, className: 'text-text-muted' },
  { header: 'Naar', cell: (row) => row.naar },
];

/**
 * ReplanDiff (43_AI_Agents.md § 5, 15_AIPlanner.md § 7.2, Sprint 7-vervolg) —
 * multi-job-diff-tabel voor een Replanning Agent-voorstel, getoond in
 * ProposalCard i.p.v. het standaard Impact/Winst-tweeluik. Aangepaste vorm
 * t.o.v. het generieke 7.2-diagram (dag-verschuiving, "extra reistijd"): bij
 * een BR-802-ziekmelding verschuift de datum niet, alleen de medewerker —
 * geen reistijd-herberekening in dit voorstel zelf (stabiliteit boven
 * optimaliteit, § 7.3), dus geen "extra reistijd"-kolom.
 */
export function ReplanDiff({ payload }: { payload: ReplanJobsPayload }) {
  const rows: ReplanRow[] = payload.moves.map((move) => ({
    jobId: move.jobId,
    customerName: move.customerName,
    van: payload.sickEmployeeFirstName,
    naar: move.targetEmployeeFirstName,
  }));

  return (
    <div className="flex flex-col gap-2">
      <DataTable<ReplanRow>
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.jobId}
        emptyTitle="Geen beurten te herverdelen."
      />
      {payload.unplaceableJobIds.length > 0 ? (
        <p className="text-warning text-xs font-medium">
          {payload.unplaceableJobIds.length}{' '}
          {payload.unplaceableJobIds.length === 1 ? 'beurt' : 'beurten'} → herplan-wachtrij
          (onplaatsbaar)
        </p>
      ) : null}
    </div>
  );
}
