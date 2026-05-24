type PinnedSkeletonProps = {
  rows?: number;
};

export function PinnedSkeleton({ rows = 3 }: PinnedSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border bg-elevated/50 p-2.5"
        >
          <div className="h-3.5 w-full rounded bg-border" />
          {i % 2 === 0 ? (
            <div className="mt-1 h-3.5 w-4/5 rounded bg-border" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
