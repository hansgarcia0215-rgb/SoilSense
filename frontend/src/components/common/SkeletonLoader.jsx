/**
 * SkeletonLoader.jsx — Shimmer skeleton placeholders for loading states
 */

/** Single skeleton block */
export function Skeleton({ className = '', width = '100%', height = '1rem', rounded = 'rounded-xl' }) {
  return (
    <div
      className={`skeleton ${rounded} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/** Full card skeleton */
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card space-y-3 animate-fade-in">
      <div className="flex items-center gap-3">
        <Skeleton width="40px" height="40px" rounded="rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton height="0.875rem" width="60%" />
          <Skeleton height="0.75rem" width="40%" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height="0.875rem" width={i === lines - 1 ? '70%' : '100%'} />
      ))}
      <div className="flex gap-2 pt-1">
        <Skeleton height="2rem" width="80px" rounded="rounded-lg" />
        <Skeleton height="2rem" width="80px" rounded="rounded-lg" />
      </div>
    </div>
  );
}

/** List row skeleton */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3 px-1 animate-fade-in">
      <Skeleton width="36px" height="36px" rounded="rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton height="0.8rem" width="55%" />
        <Skeleton height="0.7rem" width="40%" />
      </div>
      <Skeleton height="1.5rem" width="60px" rounded="rounded-full" />
    </div>
  );
}

/** Dashboard summary card skeleton */
export function SkeletonStatCard() {
  return (
    <div className="card space-y-3 animate-fade-in">
      <Skeleton width="40px" height="40px" rounded="rounded-xl" />
      <Skeleton height="1.75rem" width="50%" />
      <Skeleton height="0.75rem" width="75%" />
    </div>
  );
}

/** Full page skeleton for result pages */
export function SkeletonResult() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      {/* Fertility card */}
      <div className="card space-y-4">
        <Skeleton height="0.75rem" width="40%" />
        <div className="flex gap-4">
          <div className="space-y-2 flex-shrink-0">
            <Skeleton height="4rem" width="100px" rounded="rounded-2xl" />
            <Skeleton height="1.5rem" width="80px" rounded="rounded-full" />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height="64px" rounded="rounded-xl" />
            ))}
          </div>
        </div>
      </div>
      {/* Crop cards */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="card space-y-3">
          <div className="flex justify-between">
            <div className="space-y-2">
              <Skeleton height="1.5rem" width="60px" rounded="rounded-full" />
              <Skeleton height="1.25rem" width="140px" />
            </div>
            <Skeleton height="2.5rem" width="60px" rounded="rounded-xl" />
          </div>
          <Skeleton height="0.5rem" rounded="rounded-full" />
          <Skeleton height="0.8rem" width="85%" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
