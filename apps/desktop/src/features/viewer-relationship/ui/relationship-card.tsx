import { Pin, Sparkles } from "lucide-react";
import {
  formatPlatformLabel,
  formatRelationshipTab,
  type RelationshipTab,
} from "../../../entities/viewer-profile";
import {
  MiniComment,
  StatCard,
  type EnrichedComment,
} from "../../../entities/comment";
import type { UserRow } from "../../../entities/user";
import { cx } from "../../../shared/lib";
import { PlatformIcon } from "../../../shared/ui";
import { useRelationshipTabs } from "../model/use-relationship-tabs";
import { CommentHistoryFilterTabs } from "./comment-history-filter-tabs";
import { UserMemoSection } from "./user-memo-section";
import { UserTagSection } from "./user-tag-section";
import { CommentListSkeleton } from "./skeleton/comment-list-skeleton";
import { PinnedSkeleton } from "./skeleton/pinned-skeleton";

type UserState = {
  user: UserRow | null | undefined;
  isLoading: boolean;
  error: Error | undefined;
};

type CommentsState = {
  comments: EnrichedComment[];
  isLoading: boolean;
  error: Error | undefined;
};

type PinnedState = {
  pinned: EnrichedComment[];
  isLoading: boolean;
  error: Error | undefined;
};

type RelationshipCardProps = {
  userState: UserState;
  commentsState: CommentsState;
  pinnedState: PinnedState;
};

const RELATIONSHIP_TABS: RelationshipTab[] = ["all", "summary", "memo"];

export function RelationshipCard({
  userState,
  commentsState,
  pinnedState,
}: RelationshipCardProps) {
  const { tab, setTab, historyMode, setHistoryMode, historyComments } =
    useRelationshipTabs(commentsState.comments);

  const { user, isLoading: userLoading } = userState;

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="border-b border-border p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-border-strong to-elevated text-primary">
                {user ? (
                  <PlatformIcon platform={user.platform} />
                ) : (
                  <div className="h-5 w-5 rounded bg-border" />
                )}
              </div>
              <div className="min-w-0">
                {userLoading ? (
                  <div className="space-y-1.5">
                    <div className="animate-pulse h-5 w-32 rounded bg-border" />
                    <div className="animate-pulse h-3 w-20 rounded bg-border" />
                  </div>
                ) : user ? (
                  <>
                    <h2 className="truncate text-lg font-bold text-primary">
                      {user.displayName}
                    </h2>
                    <p className="text-xs text-muted">
                      {formatPlatformLabel(user.platform)}
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="truncate text-lg font-bold text-primary">
                      未登録ユーザー
                    </h2>
                    <p className="text-xs text-muted">履歴がありません</p>
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {/* TODO(backend): サーバ判定が入ったら statuses を反映 */}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {userLoading ? (
            <>
              <div className="animate-pulse rounded-2xl border border-border bg-elevated/50 p-2.5 h-14" />
              <div className="animate-pulse rounded-2xl border border-border bg-elevated/50 p-2.5 h-14" />
              <div className="animate-pulse rounded-2xl border border-border bg-elevated/50 p-2.5 h-14" />
            </>
          ) : user ? (
            <>
              <StatCard label="来訪" value={`${user.visitCount}回`} />
              <StatCard
                label="コメント"
                value={`${user.observedCommentCount}`}
              />
              <StatCard label="支援" value={`${user.supportCount}回`} />
            </>
          ) : (
            <>
              <StatCard label="来訪" value="—" />
              <StatCard label="コメント" value="—" />
              <StatCard label="支援" value="—" />
            </>
          )}
        </div>
      </div>

      <div className="border-b border-border p-1">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-elevated p-1">
          {RELATIONSHIP_TABS.map((item) => (
            <button
              className={cx(
                "rounded-xl text-xs p-1 font-medium transition",
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

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {tab === "summary" ? (
          <SummaryTab
            user={user}
            userLoading={userLoading}
            pinnedState={pinnedState}
          />
        ) : null}

        {tab === "memo" ? (
          <div className="space-y-5">
            <UserMemoSection memo="" />
            <UserTagSection tags={[]} />
          </div>
        ) : null}

        {tab === "all" ? (
          <div>
            <CommentHistoryFilterTabs
              mode={historyMode}
              onChange={setHistoryMode}
            />
            {commentsState.isLoading ? (
              <CommentListSkeleton />
            ) : commentsState.error ? (
              <SectionErrorMessage>
                コメント履歴を読み込めませんでした
              </SectionErrorMessage>
            ) : (
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
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type SummaryTabProps = {
  user: UserRow | null | undefined;
  userLoading: boolean;
  pinnedState: PinnedState;
};

function SummaryTab({ user, userLoading, pinnedState }: SummaryTabProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        {userLoading ? (
          <>
            <div className="animate-pulse rounded-2xl border border-border bg-elevated/50 p-2.5 h-14" />
            <div className="animate-pulse rounded-2xl border border-border bg-elevated/50 p-2.5 h-14" />
          </>
        ) : user ? (
          <>
            <StatCard
              label="初回訪問"
              value={<span className="text-sm">{user.firstSeenAt}</span>}
            />
            <StatCard
              label="最終訪問"
              value={<span className="text-sm">{user.lastSeenAt}</span>}
            />
          </>
        ) : (
          <>
            <StatCard label="初回訪問" value="—" />
            <StatCard label="最終訪問" value="—" />
          </>
        )}
      </div>
      {user?.lastSupportAt ? (
        <StatCard
          label="最終支援"
          value={
            <span className="text-sm text-brand-gold">
              {user.lastSupportAt}
            </span>
          }
        />
      ) : null}
      <UserTagSection tags={[]} />
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-primary">
          <Pin aria-hidden="true" className="h-4 w-4 text-brand-pink-strong" />
          ピン留めコメント
        </h3>
        {pinnedState.isLoading ? (
          <PinnedSkeleton />
        ) : pinnedState.error ? (
          <SectionErrorMessage>
            ピン留めを読み込めませんでした
          </SectionErrorMessage>
        ) : (
          <div className="space-y-2">
            {pinnedState.pinned.length > 0 ? (
              pinnedState.pinned
                .slice(0, 3)
                .map((comment) => (
                  <MiniComment comment={comment} key={comment.id} />
                ))
            ) : (
              <EmptyCommentMessage>
                まだピン留めはありません
              </EmptyCommentMessage>
            )}
          </div>
        )}
      </div>
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-primary">
          <Sparkles aria-hidden="true" className="h-4 w-4 text-brand-gold" />
          重要そうなコメント
        </h3>
        <EmptyCommentMessage>重要コメントは未実装です</EmptyCommentMessage>
      </div>
    </div>
  );
}

function EmptyCommentMessage({ children }: { children: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border p-3 text-sm text-muted">
      {children}
    </p>
  );
}

function SectionErrorMessage({ children }: { children: string }) {
  return (
    <p className="rounded-2xl border border-border bg-elevated/50 p-3 text-sm text-muted">
      {children}
    </p>
  );
}
