type CommentListSkeletonProps = {
  rows?: number;
};

export function CommentListSkeleton({ rows = 5 }: CommentListSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border bg-elevated/50 p-2.5"
        >
          <div className="mb-1.5 flex items-center gap-1.5">
            <div className="h-3 w-16 rounded bg-border" />
            <div className="h-3 w-10 rounded bg-border" />
          </div>
          <div className="h-3.5 w-full rounded bg-border" />
          {i % 3 === 0 ? (
            <div className="mt-1 h-3.5 w-2/3 rounded bg-border" />
          ) : null}
        </div>
      ))}
    </div>
  );
}
