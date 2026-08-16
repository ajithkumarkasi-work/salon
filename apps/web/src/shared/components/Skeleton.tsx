import { cn } from '@/shared/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return <div className={cn('skeleton h-4 w-full rounded-md', className)} {...props} />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-3">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4" />
        </td>
      ))}
    </tr>
  );
}
