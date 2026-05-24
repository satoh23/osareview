import type { CommentSource } from "@comment-dock/shared";
import type { EnrichedComment, ViewerStatus } from "../../comment";

export type RelationshipTab = "summary" | "memo" | "all";

/** 関係性カードを開くときのユーザー特定キー。`(platform, platformUserId)` の複合キー。 */
export type ViewerProfileLookupKey = {
  platform: CommentSource;
  platformUserId: string;
};

export type HistoryMode = "important" | "filtered" | "all";

export type ViewerProfile = {
  userId: string;
  platform: CommentSource;
  displayName: string;
  firstSeenAt: string;
  lastSeenAt: string;
  visitCount: number;
  commentCount: number;
  supportCount: number;
  lastSupportAt?: string;
  statuses: ViewerStatus[];
  tags: string[];
  memo: string;
  pinnedComments: EnrichedComment[];
  importantComments: EnrichedComment[];
  recentComments: EnrichedComment[];
};
