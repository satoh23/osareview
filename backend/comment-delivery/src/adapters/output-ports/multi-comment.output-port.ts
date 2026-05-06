import type { CommentOutputPort } from "../../usecases/interfaces/comment-output-port.interface.js";
import type { CommentViewDto } from "@comment-dock/shared";
import { injectAll, injectable } from "tsyringe";
import { DELIVERY_DI_TOKENS } from "../../infrastructure/shared/di-tokens.js";

// 複数の出力先へ同じコメントを配る中継用ポート。
// ここ自身は送信を行わず、WebSocket/Console など各出力先へ fanout する。
@injectable()
export class MultiCommentOutputPort implements CommentOutputPort {
  constructor(
    @injectAll(DELIVERY_DI_TOKENS.commentOutputTarget)
    private readonly ports: readonly CommentOutputPort[],
  ) {}

  async outputToUi(comments: CommentViewDto[]): Promise<void> {
    const results = await Promise.allSettled(
      this.ports.map(async (port) => {
        await port.outputToUi(comments);
      }),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.warn(
          "[comment-delivery] an output port failed, but processing continues",
          result.reason,
        );
      }
    }
  }

  async close(): Promise<void> {
    const results = await Promise.allSettled(
      this.ports.map(async (port) => {
        await port.close?.();
      }),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.warn(
          "[comment-delivery] an output port close failed, but shutdown continues",
          result.reason,
        );
      }
    }
  }
}
