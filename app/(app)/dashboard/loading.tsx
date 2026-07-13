import { Skeleton } from '@/components/primitives/skeleton';

/** Dashboard-skeleton (42_DesignSystem.md § 21/23) — mimt de KPI-secties, geen layout-shift. */
export default function DashboardLoading() {
  return (
    <div>
      <div className="flex flex-col gap-2 pb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-8">
        {Array.from({ length: 3 }).map((_, section) => (
          <div key={section} className="flex flex-col gap-3">
            <Skeleton className="h-5 w-24" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
