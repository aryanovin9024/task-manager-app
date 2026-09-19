import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-60 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-8 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-3 w-full max-w-md" />
            </div>
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-6">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-48 max-w-[55%]" />
            </div>
            <div className="flex items-center justify-between gap-6">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-32 max-w-[45%]" />
            </div>
            <Skeleton className="h-3 w-full max-w-sm" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
