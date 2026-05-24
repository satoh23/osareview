import { useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { UserRound, X } from "lucide-react";
import type { DbPlatform } from "../../../entities/live-session/model/types";
import { useViewerUser } from "../../../features/viewer-relationship/model/use-viewer-user";
import { useViewerComments } from "../../../features/viewer-relationship/model/use-viewer-comments";
import { useViewerPinnedComments } from "../../../features/viewer-relationship/model/use-viewer-pinned-comments";
import { RelationshipCard } from "../../../features/viewer-relationship";
import { markPerf } from "../../../shared/lib";

export type RelationshipWindowLookupKey = {
  platform: DbPlatform;
  platformUserId: string;
};

type RelationshipWindowContentProps = {
  lookupKey: RelationshipWindowLookupKey;
};

export function RelationshipWindowContent({
  lookupKey,
}: RelationshipWindowContentProps) {
  const handleClose = () => {
    void getCurrentWebviewWindow().close();
  };

  const userState = useViewerUser(lookupKey);
  const userId = userState.user?.id;
  const commentsState = useViewerComments(userId);
  const pinnedState = useViewerPinnedComments(userId);

  useEffect(() => {
    markPerf("viewer-card:content-mounted");
  }, []);

  return (
    <main className="flex h-screen overflow-hidden bg-surface text-primary">
      <section className="flex h-full w-full flex-col overflow-hidden border border-border bg-surface shadow-2xl shadow-black/60">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-elevated/80 px-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <UserRound
              aria-hidden="true"
              className="h-4 w-4 text-brand-pink-strong"
            />
            関係性カード
          </div>
          <button
            aria-label="関係性カードを閉じる"
            className="rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-primary"
            onClick={handleClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <RelationshipCard
          userState={userState}
          commentsState={commentsState}
          pinnedState={pinnedState}
        />
      </section>
    </main>
  );
}
