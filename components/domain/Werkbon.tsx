import { StatusBadge } from '@/components/domain/StatusBadge';
import { JOB_STATUS_LABEL, JOB_STATUS_TONE } from '@/lib/labels';
import type { Database } from '@/types/database.types';

export interface WerkbonData {
  customerName: string;
  objectAddress: string;
  serviceName: string;
  employeeName: string;
  scheduledDate: string;
  status: Database['public']['Enums']['job_status'];
  notes: string | null;
  photoUrls: { type: 'before' | 'after'; url: string }[];
}

/**
 * Werkbon (Sprint 5-opdracht) — klant/object/dienst/medewerker/datum/
 * opmerkingen/foto's/status, herbruikt zowel op /m/beurt/[id]/werkbon
 * (medewerker) als in het desktop route-details-paneel (planner).
 */
export function Werkbon({ data }: { data: WerkbonData }) {
  const before = data.photoUrls.filter((p) => p.type === 'before');
  const after = data.photoUrls.filter((p) => p.type === 'after');

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-text text-base font-semibold">{data.customerName}</h2>
          <p className="text-text-muted text-sm">{data.objectAddress}</p>
        </div>
        <StatusBadge label={JOB_STATUS_LABEL[data.status]} tone={JOB_STATUS_TONE[data.status]} />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-text-muted text-xs">Dienst</dt>
          <dd className="text-text">{data.serviceName}</dd>
        </div>
        <div>
          <dt className="text-text-muted text-xs">Medewerker</dt>
          <dd className="text-text">{data.employeeName}</dd>
        </div>
        <div>
          <dt className="text-text-muted text-xs">Datum</dt>
          <dd className="text-text">{data.scheduledDate}</dd>
        </div>
      </dl>

      {data.notes && (
        <div>
          <p className="text-text-muted text-xs">Opmerkingen</p>
          <p className="text-text text-sm">{data.notes}</p>
        </div>
      )}

      {(before.length > 0 || after.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-text-muted mb-1 text-xs">Vóór</p>
            <div className="grid grid-cols-3 gap-1">
              {before.map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element -- signed Storage-URL, geen Next.js image-optimalisatie
                <img
                  key={photo.url}
                  src={photo.url}
                  alt="Vóór"
                  className="aspect-square rounded-sm object-cover"
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-text-muted mb-1 text-xs">Na</p>
            <div className="grid grid-cols-3 gap-1">
              {after.map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element -- signed Storage-URL, geen Next.js image-optimalisatie
                <img
                  key={photo.url}
                  src={photo.url}
                  alt="Na"
                  className="aspect-square rounded-sm object-cover"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
