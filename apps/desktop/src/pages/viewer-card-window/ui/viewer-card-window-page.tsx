import { Navigate, useParams } from "react-router";
import type { ReactNode } from "react";
import { useViewerProfile } from "../../../features/viewer-relationship";
import { RelationshipWindowContent } from "../../../widgets";

export function ViewerCardWindowPage() {
  const { userId } = useParams();
  const { error, isLoading, profile } = useViewerProfile(userId);

  if (!userId) {
    return <Navigate replace to="/" />;
  }

  if (isLoading) {
    return (
      <ViewerCardWindowShell>
        <p className="rounded-2xl border border-border bg-elevated/50 p-4 text-sm text-muted">
          関係性カードを読み込んでいます...
        </p>
      </ViewerCardWindowShell>
    );
  }

  if (error || !profile) {
    return (
      <ViewerCardWindowShell>
        <div className="rounded-2xl border border-dashed border-border bg-elevated/50 p-4 text-sm text-muted">
          <p className="font-semibold text-primary">
            視聴者プロフィールが見つかりません
          </p>
          <p className="mt-1 text-xs leading-5">userId: {userId}</p>
        </div>
      </ViewerCardWindowShell>
    );
  }

  return <RelationshipWindowContent profile={profile} />;
}

function ViewerCardWindowShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex h-screen items-center justify-center overflow-hidden bg-surface p-4 text-primary">
      {children}
    </main>
  );
}
