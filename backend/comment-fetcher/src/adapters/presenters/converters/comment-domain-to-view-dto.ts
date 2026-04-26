import type { CommentViewDto } from "@comment-dock/shared";
import type { Comment } from "../../../entities/comment/comment.js";

export const convertCommentDomainToViewDto = (
  comment: Comment,
): CommentViewDto => {
  return {
    id: comment.id,
    source: comment.source,
    author: {
      id: comment.author.id,
      name: comment.author.name,
    },
    text: comment.text,
    publishedAt: comment.publishedAt.toISOString(),
    eventType: comment.eventType,
    monetaryAmount: comment.monetaryAmount,
  };
};
