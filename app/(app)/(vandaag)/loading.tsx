import { Skeleton } from '@/components/primitives/skeleton';

/**
 * Morning Briefing-skeleton (42_DesignSystem.md § 21/23) — mimt de vaste
 * § 3-opbouw (welkom → dagoverzicht → weer → samenvatting → voorstellen)
 * zodat er geen layout-shift optreedt zodra de echte data laadt.
 */
export default function MorningBriefingLoading() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-7 w-32 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[74px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-52 rounded-lg" />
        <Skeleton className="h-52 rounded-lg" />
      </div>
    </div>
  );
}
