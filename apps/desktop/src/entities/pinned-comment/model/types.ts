export type InsertPinnedCommentInput = {
  userId: number;
  commentId?: number | null;
  pinnedText: string;
  note?: string | null;
};
