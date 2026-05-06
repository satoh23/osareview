import type { CommentOutputPort } from "../../usecases/comment-collection/comment-collection.interface.js";
import type { Comment } from "../../entities/comment/comment.js";

export class ConsoleCommentOutputPort implements CommentOutputPort {
  async publish(comments: Comment[]): Promise<void> {
    for (const comment of comments) {
      console.info("[comment]", {
        source: comment.source,
        author: comment.author.name,
        text: comment.text,
        eventType: comment.eventType,
      });
    }
  }
}
