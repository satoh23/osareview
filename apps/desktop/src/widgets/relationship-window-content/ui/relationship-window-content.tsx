import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { UserRound, X } from "lucide-react";
import type { ViewerProfile } from "../../../entities/viewer-profile";
import { RelationshipCard } from "../../../features/viewer-relationship";

type RelationshipWindowContentProps = {
  profile: ViewerProfile;
};

export function RelationshipWindowContent({
  profile,
}: RelationshipWindowContentProps) {
  const handleClose = () => {
    void getCurrentWebviewWindow().close();
  };

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
        <RelationshipCard profile={profile} />
      </section>
    </main>
  );
}
