import { Skeleton } from '@/components/primitives/skeleton';

/**
 * 42_DesignSystem.md § 21: skeleton mimt de RouteBoard-layout (kolomkop +
 * kaart-vormige blokken), geen generieke spinner — voorkomt layout-shift
 * zodra de echte data laadt.
 */
export default function PlanningLoading() {
  return (
    <div>
      <Skeleton className="mb-2 h-8 w-40" />
      <Skeleton className="mb-6 h-4 w-56" />
      <Skeleton className="mb-6 h-9 w-64" />
      <div className="flex gap-4 overflow-x-hidden">
        {Array.from({ length: 4 }).map((_, columnIndex) => (
          <div key={columnIndex} className="w-[280px] shrink-0 space-y-2">
            <div className="border-border rounded-t-lg border border-b-0 p-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-6 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
            <div className="border-border space-y-2 rounded-b-lg border p-2">
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <Skeleton key={cardIndex} className="h-20 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
