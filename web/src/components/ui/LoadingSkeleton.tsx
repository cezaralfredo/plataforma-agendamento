import { BarChart3, CalendarDays } from 'lucide-react';

interface SkeletonLineProps {
  width?: string;
  className?: string;
}

export function SkeletonLine({ width = 'w-full', className = '' }: SkeletonLineProps) {
  return (
    <div
      className={`h-4 animate-pulse rounded bg-gray-200 ${width} ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <SkeletonLine width="w-1/3" className="mb-4" />
      <SkeletonLine width="w-2/3" className="mb-3" />
      <SkeletonLine width="w-1/2" className="mb-6" />
      <div className="flex gap-2">
        <SkeletonLine width="w-20" className="h-8" />
        <SkeletonLine width="w-20" className="h-8" />
      </div>
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 flex gap-4 border-b border-gray-200 pb-3">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLine key={`th-${i}`} width="w-1/4" className="h-5" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`row-${r}`} className="flex gap-4 border-b border-gray-100 py-3 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <SkeletonLine key={`cell-${r}-${c}`} width="w-1/4" className="h-4" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <SkeletonLine width="w-24" className="h-4" />
          <SkeletonLine width="w-16" className="h-8" />
          <SkeletonLine width="w-20" className="h-3" />
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <BarChart3 className="h-6 w-6 text-gray-300" />
        </div>
      </div>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <SkeletonLine width="w-32" className="h-6" />
        <div className="flex gap-2">
          <SkeletonLine width="w-20" className="h-8" />
          <SkeletonLine width="w-20" className="h-8" />
        </div>
      </div>
      <div className="mb-4 grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonLine key={`header-${i}`} className="h-6" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={`day-${i}`} className="flex aspect-square items-center justify-center">
            <div className="h-8 w-8 rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AppointmentsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={`apt-${i}`} className="animate-pulse rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <SkeletonLine width="w-40" className="h-5" />
              <SkeletonLine width="w-24" className="h-4" />
              <SkeletonLine width="w-32" className="h-4" />
            </div>
            <SkeletonLine width="w-20" className="h-6 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
