import type { Comment } from "@comment-dock/comment-fetcher";

export interface CommentSource {
  receiveComments(): AsyncIterable<Comment[]>;
}
