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
