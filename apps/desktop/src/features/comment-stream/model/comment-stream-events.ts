import type { CommentViewDto } from "@comment-dock/shared";

export const COMMENT_STREAM_EVENT_TYPES = {
  COMMENT_PUBLISHED: "commentPublished",
  COMMENTS_PUBLISHED: "commentsPublished",
} as const;

export type CommentStreamEvent =
  | {
      type: typeof COMMENT_STREAM_EVENT_TYPES.COMMENT_PUBLISHED;
      comment: CommentViewDto;
    }
  | {
      type: typeof COMMENT_STREAM_EVENT_TYPES.COMMENTS_PUBLISHED;
      comments: CommentViewDto[];
    };

export type CommentStreamEventListener = (event: CommentStreamEvent) => void;

const listeners = new Set<CommentStreamEventListener>();

/**
 * WebSocket で受信した単一コメントを、表示用 comment-stream の購読者へ配送する。
 * DB 保存経路とは分離し、画面更新だけをこの中継点で扱う。
 */
export const publishComment = (comment: CommentViewDto): void => {
  for (const listener of listeners) {
    listener({
      type: COMMENT_STREAM_EVENT_TYPES.COMMENT_PUBLISHED,
      comment,
    });
  }
};

/**
 * WebSocket でまとめて受信したコメント群を、1 回のイベントとして配送する。
 */
export const publishComments = (comments: CommentViewDto[]): void => {
  for (const listener of listeners) {
    listener({
      type: COMMENT_STREAM_EVENT_TYPES.COMMENTS_PUBLISHED,
      comments,
    });
  }
};

export const subscribeCommentStream = (
  listener: CommentStreamEventListener,
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
