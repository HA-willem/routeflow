import { EmptyState } from '@/components/primitives/empty-state';
import type { CronJobStatus } from '@/lib/platform-admin/queries';

const JOB_LABEL: Record<string, string> = {
  'agent-orchestrator-nightly': 'Agent Orchestrator (nachtelijk)',
  'subscription-billing-monthly': 'Abonnementsfacturatie (maandelijks)',
};

/**
 * CronStatusOverview — Sprint 10, observability-basis. Laatste run per
 * bekende pg_cron-job (get_cron_job_status(), 039_cron_job_status.sql) —
 * zelfde tabel-stijl als OperationalOverview.tsx.
 */
export function CronStatusOverview({ jobs }: { jobs: CronJobStatus[] }) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        title="Geen geplande cron-jobs gevonden."
        description="agent-orchestrator-nightly en subscription-billing-monthly zouden hier moeten staan."
      />
    );
  }

  return (
    <div className="border-border overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Cron-job</th>
            <th className="px-4 py-3 font-medium">Status laatste run</th>
            <th className="px-4 py-3 font-medium">Laatste run</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.jobName} className="border-border border-t">
              <td className="px-4 py-3">{JOB_LABEL[job.jobName] ?? job.jobName}</td>
              <td
                className={`px-4 py-3 ${job.lastStatus === 'failed' ? 'text-warning font-medium' : ''}`}
              >
                {job.lastStatus ?? 'Nog niet gedraaid'}
              </td>
              <td className="px-4 py-3">
                {job.lastStartTime ? new Date(job.lastStartTime).toLocaleString('nl-NL') : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
