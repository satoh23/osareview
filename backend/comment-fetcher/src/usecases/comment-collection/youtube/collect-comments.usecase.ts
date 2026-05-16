import { setTimeout as sleep } from "node:timers/promises";
import type { CommentRepository } from "../comment-repository.interface.js";
import { DEFAULT_COMMENT_STREAM_RECONNECT_INTERVAL_MS } from "../../../infrastructure/youtube/config/comment-collection.js";
import type {
  CollectCommentsInput,
  CollectCommentsStream,
} from "../comment-collection.types.js";

export class CollectYouTubeCommentsUseCase {
  constructor(
    private readonly repository: CommentRepository,
    private readonly reconnectIntervalMs = DEFAULT_COMMENT_STREAM_RECONNECT_INTERVAL_MS,
    // テスト時に再接続待機を差し替えて高速・安定に検証できるよう注入可能にしている。
    private readonly wait: (milliseconds: number) => Promise<void> = async (
      milliseconds,
    ) => {
      await sleep(milliseconds);
    },
  ) {}

  async *streamCommentsFromLiveChat(
    input: CollectCommentsInput,
  ): CollectCommentsStream {
    let nextPageToken = input.pageToken;
    const retryOnStreamEnd = input.retryOnStreamEnd ?? true;

    while (true) {
      try {
        for await (const chunk of this.repository.streamComments({
          liveChatId: input.liveChatId,
          pageToken: nextPageToken,
        })) {
          nextPageToken = chunk.nextPageToken;
          if (chunk.comments.length > 0) {
            yield chunk.comments;
          }
        }
      } catch (error) {
        console.warn(
          retryOnStreamEnd
            ? "[CollectYouTubeCommentsUseCase] stream disconnected, reconnecting with last pageToken"
            : "[CollectYouTubeCommentsUseCase] stream disconnected",
          error,
        );
      }

      if (!retryOnStreamEnd) {
        return;
      }

      await this.wait(this.reconnectIntervalMs);
    }
  }
}
