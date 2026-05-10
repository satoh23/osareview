/** マイグレーションの `CHECK (platform IN ('youtube','twitch'))` に対応する型。 */
export type DbPlatform = "youtube" | "twitch";

export type UpsertUserInput = {
  platform: DbPlatform;
  platformUserId: string;
  displayName: string;
  /** ISO 8601（UTC）文字列。INSERT 時は初回/最終閲覧、更新時は `last_seen` に使う。 */
  seenAt: string;
};

export type UpsertLiveSessionInput = {
  platform: DbPlatform;
  platformLiveId: string;
  title?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
};

export type UpsertLiveSessionUserInput = {
  liveSessionId: number;
  userId: number;
  /** このコメントイベントの ISO 8601（UTC）文字列。 */
  commentAt: string;
};

export type InsertCommentInput = {
  liveSessionId: number;
  userId: number;
  platform: DbPlatform;
  platformCommentId?: string | null;
  commentText: string;
  commentType?: string;
  isLowSignal?: boolean;
  commentedAt: string;
};

export type UpsertUserMemoInput = {
  userId: number;
  memo: string;
};

export type CreateTagInput = {
  name: string;
};

export type DeleteTagInput = {
  tagId: number;
};

export type LinkUserTagInput = {
  userId: number;
  tagId: number;
};

export type InsertPinnedCommentInput = {
  userId: number;
  commentId?: number | null;
  pinnedText: string;
  note?: string | null;
};

export type InsertSupportEventInput = {
  platform: DbPlatform;
  liveSessionId: number;
  userId: number;
  eventType: string;
  amountMicros?: number | null;
  currency?: string | null;
  message?: string | null;
  occurredAt: string;
};

/**
 * コメント書き込みキューの1要素。`liveSessionId` は既に存在する必要がある
 * （例: 配信接続時に行を作成）。キューはセッション行を作らない。
 */
export type QueuedCommentWrite = {
  liveSessionId: number;
  platform: DbPlatform;
  platformUserId: string;
  displayName: string;
  platformCommentId?: string | null;
  commentText: string;
  commentType?: string;
  isLowSignal?: boolean;
  commentedAt: string;
};
