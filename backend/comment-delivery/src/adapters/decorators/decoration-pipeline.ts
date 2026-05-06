import type { CommentViewDto } from "@comment-dock/shared";
import type { CommentDecorator } from "../../usecases/interfaces/comment-decorator.interface.js";

export class DecorationPipeline {
  constructor(private readonly decorators: readonly CommentDecorator[]) {}

  async decorateComments(
    comments: CommentViewDto[],
  ): Promise<CommentViewDto[]> {
    const results: CommentViewDto[] = [];

    for (const comment of comments) {
      let current = comment;
      for (const decorator of this.decorators) {
        current = await decorator.decorate(current);
      }
      results.push(current);
    }

    return results;
  }
}
