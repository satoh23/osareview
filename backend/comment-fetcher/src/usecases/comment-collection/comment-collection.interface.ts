import type { Comment } from "../../entities/comment/comment.js";

export interface CommentOutputPort {
  publish(comments: Comment[]): Promise<void>;
}
