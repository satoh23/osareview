import type { CommentViewDto } from "@comment-dock/shared";
import type { DbPlatform } from "../../live-session/model/types";

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

export type ViewerStatus =
  | "first_time"
  | "second_time"
  | "regular"
  | "long_time_no_see"
  | "supporter";

export type CommentType =
  | "question"
  | "first_time"
  | "long_time_no_see"
  | "support"
  | "thanks"
  | "praise"
  | "self_disclosure"
  | "low_signal"
  | "caution"
  | "normal";

export type SupportType = "super_chat" | "member" | "bits" | "sub";

export type CommentSupport = {
  type: SupportType;
  amountLabel?: string;
  isFirstSupport?: boolean;
};

export type EnrichedComment = CommentViewDto & {
  viewerStatus?: ViewerStatus;
  commentTypes: CommentType[];
  isLowSignal: boolean;
  isImportant: boolean;
  isPinned: boolean;
  support?: CommentSupport;
  badges: string[];
};
