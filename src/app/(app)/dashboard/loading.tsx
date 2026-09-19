import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-8 w-full rounded-lg sm:w-72" />

        <Card>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-lg" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-[260px] w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
