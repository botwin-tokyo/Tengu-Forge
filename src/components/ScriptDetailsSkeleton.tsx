import { Skeleton } from '@/components/ui/skeleton';

export function ScriptDetailsSkeleton() {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header skeleton */}
      <div className="p-6 border-b border-border bg-card/50">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="border-b border-border px-6 py-3">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full max-w-2xl" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
