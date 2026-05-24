export function RelationshipCardSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="border-b border-border p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 w-full">
            <div className="mb-1.5 flex items-center gap-2">
              <div className="animate-pulse h-10 w-10 shrink-0 rounded-2xl bg-border" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="animate-pulse h-5 w-32 rounded bg-border" />
                <div className="animate-pulse h-3 w-20 rounded bg-border" />
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="animate-pulse h-4 w-14 rounded-full bg-border" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["来訪", "コメント", "支援"].map((label) => (
            <div
              key={label}
              className="animate-pulse rounded-2xl border border-border bg-elevated/50 p-2.5 text-center"
            >
              <div className="mx-auto mb-1 h-4 w-12 rounded bg-border" />
              <div className="mx-auto h-3 w-8 rounded bg-border" />
            </div>
          ))}
        </div>
      </div>

      <div className="border-b border-border p-1">
        <div className="animate-pulse grid grid-cols-3 gap-1 rounded-2xl bg-elevated p-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-6 rounded-xl bg-border/50" />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
