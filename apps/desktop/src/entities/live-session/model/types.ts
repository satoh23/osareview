/** マイグレーションの `CHECK (platform IN ('youtube','twitch'))` に対応する型。 */
export type DbPlatform = "youtube" | "twitch";

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
