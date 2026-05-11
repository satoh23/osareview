import type { DbPlatform } from "../../live-session/model/types";

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
