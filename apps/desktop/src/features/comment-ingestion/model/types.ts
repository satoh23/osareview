import type { DbPlatform } from "../../../entities/live-session/model/types";

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
