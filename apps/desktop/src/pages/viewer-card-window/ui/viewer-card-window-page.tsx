import { Navigate, useParams, useSearchParams } from "react-router";
import type { ReactNode } from "react";
import { COMMENT_SOURCES, type CommentSource } from "@comment-dock/shared";
import { useViewerProfile } from "../../../features/viewer-relationship";
import { RelationshipWindowContent } from "../../../widgets";
import type { ViewerProfile } from "../../../entities/viewer-profile";

export function ViewerCardWindowPage() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const { isLoading, profile } = useViewerProfile(userId);

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

  const displayProfile =
    profile ??
    createFallbackViewerProfile({
      displayName: searchParams.get("displayName") ?? undefined,
      source: searchParams.get("source"),
      userId,
    });

  return <RelationshipWindowContent profile={displayProfile} />;
}

function ViewerCardWindowShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex h-screen items-center justify-center overflow-hidden bg-surface p-4 text-primary">
      {children}
    </main>
  );
}

const createFallbackViewerProfile = ({
  displayName,
  source,
  userId,
}: {
  displayName?: string;
  source: string | null;
  userId: string;
}): ViewerProfile => ({
  userId,
  platform: toCommentSource(source),
  displayName: displayName ?? userId,
  firstSeenAt: "未取得",
  lastSeenAt: "未取得",
  visitCount: 0,
  commentCount: 0,
  supportCount: 0,
  statuses: [],
  tags: [],
  memo: "TODO(backend): viewer-profile repository が実データ化されたら、この仮プロフィールを置き換える。",
  pinnedComments: [],
  importantComments: [],
  recentComments: [],
});

const toCommentSource = (source: string | null): CommentSource => {
  if (source === COMMENT_SOURCES.TWITCH) {
    return COMMENT_SOURCES.TWITCH;
  }
  return COMMENT_SOURCES.YOUTUBE;
};
