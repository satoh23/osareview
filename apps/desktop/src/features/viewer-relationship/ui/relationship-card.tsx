import { Pin, Sparkles } from "lucide-react";
import {
  formatPlatformLabel,
  formatRelationshipTab,
  type RelationshipTab,
  type ViewerProfile,
} from "../../../entities/viewer-profile";
import {
  formatViewerStatus,
  MiniComment,
  StatCard,
} from "../../../entities/comment";
import { cx } from "../../../shared/lib";
import { Badge, PlatformIcon } from "../../../shared/ui";
import { useRelationshipTabs } from "../model/use-relationship-tabs";
import { CommentHistoryFilterTabs } from "./comment-history-filter-tabs";
import { UserMemoSection } from "./user-memo-section";
import { UserTagSection } from "./user-tag-section";

type RelationshipCardProps = {
  profile: ViewerProfile;
};

const RELATIONSHIP_TABS: RelationshipTab[] = ["all", "summary", "memo"];

export function RelationshipCard({ profile }: RelationshipCardProps) {
  const { tab, setTab, historyMode, setHistoryMode, historyComments } =
    useRelationshipTabs(profile);

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="border-b border-border p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-border-strong to-elevated text-primary">
                <PlatformIcon platform={profile.platform} />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-primary">
                  {profile.displayName}
                </h2>
                <p className="text-xs text-muted">
                  {formatPlatformLabel(profile.platform)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {profile.statuses.map((status) => (
                <ViewerStatusBadge key={status} status={status} />
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="来訪" value={`${profile.visitCount}回`} />
          <StatCard label="コメント" value={`${profile.commentCount}`} />
          <StatCard label="支援" value={`${profile.supportCount}回`} />
        </div>
      </div>

      <div className="border-b border-border p-2">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-elevated p-1">
          {RELATIONSHIP_TABS.map((item) => (
            <button
              className={cx(
                "rounded-xl px-2 py-2 text-xs font-medium transition",
                tab === item
                  ? "bg-surface-muted text-primary"
                  : "text-muted hover:text-secondary",
              )}
              key={item}
              onClick={() => setTab(item)}
              type="button"
            >
              {formatRelationshipTab(item)}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "summary" ? <SummaryTab profile={profile} /> : null}

        {tab === "memo" ? (
          <div className="space-y-5">
            <UserMemoSection memo={profile.memo} />
            <UserTagSection tags={profile.tags} />
          </div>
        ) : null}

        {tab === "all" ? (
          <div>
            <CommentHistoryFilterTabs
              mode={historyMode}
              onChange={setHistoryMode}
            />
            <div className="space-y-2">
              {historyComments.map((comment) => (
                <MiniComment comment={comment} key={comment.id} />
              ))}
              {historyComments.length === 0 ? (
                <EmptyCommentMessage>
                  表示対象のコメントがありません
                </EmptyCommentMessage>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SummaryTab({ profile }: RelationshipCardProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="初回訪問"
          value={<span className="text-sm">{profile.firstSeenAt}</span>}
        />
        <StatCard
          label="最終訪問"
          value={<span className="text-sm">{profile.lastSeenAt}</span>}
        />
      </div>
      {profile.lastSupportAt ? (
        <StatCard
          label="最終支援"
          value={
            <span className="text-sm text-brand-gold">
              {profile.lastSupportAt}
            </span>
          }
        />
      ) : null}
      <UserTagSection tags={profile.tags} />
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-primary">
          <Pin aria-hidden="true" className="h-4 w-4 text-brand-pink-strong" />
          ピン留めコメント
        </h3>
        <div className="space-y-2">
          {profile.pinnedComments.length > 0 ? (
            profile.pinnedComments
              .slice(0, 3)
              .map((comment) => (
                <MiniComment comment={comment} key={comment.id} />
              ))
          ) : (
            <EmptyCommentMessage>まだピン留めはありません</EmptyCommentMessage>
          )}
        </div>
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-primary">
          <Sparkles aria-hidden="true" className="h-4 w-4 text-brand-gold" />
          重要そうなコメント
        </h3>
        <div className="space-y-2">
          {profile.importantComments.slice(0, 3).map((comment) => (
            <MiniComment comment={comment} key={comment.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ViewerStatusBadge({
  status,
}: {
  status: ViewerProfile["statuses"][number];
}) {
  return (
    <Badge tone={status === "supporter" ? "gold" : "blue"}>
      {formatViewerStatus(status)}
    </Badge>
  );
}

function EmptyCommentMessage({ children }: { children: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border p-3 text-sm text-muted">
      {children}
    </p>
  );
}
