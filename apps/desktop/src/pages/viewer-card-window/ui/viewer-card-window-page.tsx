import { Navigate, useParams } from "react-router";
import type { ReactNode } from "react";
import { COMMENT_SOURCES, type CommentSource } from "@comment-dock/shared";
import { useViewerProfile } from "../../../features/viewer-relationship";
import { RelationshipWindowContent } from "../../../widgets";

export function ViewerCardWindowPage() {
  const { platform, platformUserId } = useParams();
  const lookupKey =
    platform && platformUserId
      ? {
          platform: toCommentSource(platform),
          platformUserId,
        }
      : undefined;

  const { isLoading, profile, error } = useViewerProfile(lookupKey);

  if (!platform || !platformUserId) {
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

  if (error) {
    console.error("[viewer-card] プロフィール取得エラー", error);
    return (
      <ViewerCardWindowShell>
        <p className="rounded-2xl border border-border bg-elevated/50 p-4 text-sm text-muted">
          データの読み込みに失敗しました
          <br />
          <span className="text-[11px] opacity-70">{error.message}</span>
        </p>
      </ViewerCardWindowShell>
    );
  }

  if (!profile) {
    return (
      <ViewerCardWindowShell>
        <p className="rounded-2xl border border-border bg-elevated/50 p-4 text-sm text-muted">
          このユーザーの履歴はまだありません
        </p>
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

const toCommentSource = (source: string): CommentSource => {
  if (source === COMMENT_SOURCES.TWITCH) {
    return COMMENT_SOURCES.TWITCH;
  }
  return COMMENT_SOURCES.YOUTUBE;
};
