import { Skeleton } from '@/components/primitives/skeleton';

export default function KlantenLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
