import type { CommentViewDto } from "../comment/comment-view.dto.js";

export const COMMENT_DELIVERY_MESSAGE_TYPES = {
  COMMENTS_APPEND: "comments.append",
  COMMENTS_BATCH: "comments.batch",
} as const;

export type CommentDeliveryMessageType =
  (typeof COMMENT_DELIVERY_MESSAGE_TYPES)[keyof typeof COMMENT_DELIVERY_MESSAGE_TYPES];

export type CommentsAppendMessage = {
  type: typeof COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_APPEND;
  payload: {
    comment: CommentViewDto;
  };
};

export type CommentsBatchMessage = {
  type: typeof COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_BATCH;
  payload: {
    comments: CommentViewDto[];
  };
};

export type CommentDeliveryMessage =
  | CommentsAppendMessage
  | CommentsBatchMessage;
