export type InsertPinnedCommentInput = {
  userId: number;
  commentId?: number | null;
  pinnedText: string;
  note?: string | null;
};

export type PinnedCommentRow = {
  id: number;
  userId: number;
  commentId: number | null;
  pinnedText: string;
  note: string | null;
  // 元コメント（commentId が null のときはすべて null）
  commentText: string | null;
  commentType: string | null;
  commentedAt: string | null;
  commentPlatform: string | null;
  liveSessionId: number | null;
  liveSessionTitle: string | null;
  liveSessionPlatformLiveId: string | null;
  liveSessionStartedAt: string | null;
};
