import type { CommentViewDto } from "@comment-dock/shared";
import type { Comment } from "../../entities/comment/comment.js";
import { convertCommentDomainToViewDto } from "./converters/comment-domain-to-view-dto.js";

export class CommentPresenter {
  present(comments: Comment[]): void {
    const viewDtos = comments.map(convertCommentDomainToViewDto);
    this.emitToConsoleStub(viewDtos);
  }

  private emitToConsoleStub(viewDtos: CommentViewDto[]): void {
    // TODO: ローンチ前に削除（UI/WebSocket配信に置き換える）
    for (const dto of viewDtos) {
      console.info("[comment]", {
        source: dto.source,
        author: dto.author.name,
        text: dto.text,
        eventType: dto.eventType,
      });
    }
  }
}
