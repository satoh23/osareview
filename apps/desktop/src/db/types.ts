/** Matches `CHECK (platform IN ('youtube','twitch'))` in migrations. */
export type DbPlatform = "youtube" | "twitch";

export type UpsertUserInput = {
  platform: DbPlatform;
  platformUserId: string;
  displayName: string;
  /** ISO 8601 UTC string; used for first/last seen on insert and last_seen on update. */
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
  /** ISO 8601 UTC string for this comment event. */
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
  rawPayloadJson?: string | null;
};
