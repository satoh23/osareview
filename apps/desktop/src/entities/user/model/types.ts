import type { DbPlatform } from "../../live-session/model/types";

/** `users` テーブルの読み取り結果。camelCase に正規化済み。 */
export type UserRow = {
  id: number;
  platform: DbPlatform;
  platformUserId: string;
  displayName: string;
  firstSeenAt: string;
  lastSeenAt: string;
  visitCount: number;
  observedCommentCount: number;
  supportCount: number;
  lastSupportAt: string | null;
};

export type UpsertUserInput = {
  platform: DbPlatform;
  platformUserId: string;
  displayName: string;
  /** ISO 8601（UTC）文字列。INSERT 時は初回/最終閲覧、更新時は `last_seen` に使う。 */
  seenAt: string;
};

export type UpsertUserMemoInput = {
  userId: number;
  memo: string;
};

export type LinkUserTagInput = {
  userId: number;
  tagId: number;
};
