import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  rounded = 'rounded-md',
}) => (
  <div
    className={`animate-pulse bg-slate-800/20 dark:bg-slate-700/30 ${rounded} ${className}`}
    style={{ width, height }}
    role="status"
    aria-live="polite"
  >
    <span className="sr-only">Loading…</span>
  </div>
);

export function ChartSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-6 backdrop-blur">
      <Skeleton width="40%" height="24px" />
      <Skeleton width="100%" height="320px" rounded="rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} height="80px" rounded="rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton width="240px" height="36px" />
        <Skeleton width="160px" height="32px" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} height="150px" rounded="rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton height="260px" rounded="rounded-2xl" />
        <Skeleton height="260px" rounded="rounded-2xl" />
      </div>
      <Skeleton height="360px" rounded="rounded-2xl" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-surface/40 p-4">
      <Skeleton width="30%" height="20px" className="mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <Skeleton key={idx} height="16px" />
        ))}
      </div>
    </div>
  );
}

export function StrategySkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton width="320px" height="32px" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton height="180px" rounded="rounded-2xl" />
        <Skeleton height="180px" rounded="rounded-2xl" />
      </div>
      <TableSkeleton rows={8} />
      <TableSkeleton rows={8} />
      <TableSkeleton rows={8} />
    </div>
  );
}

export default Skeleton;

