import { setTimeout as sleep } from "node:timers/promises";
import type { Comment } from "../../entities/comment/comment.js";
import type {
  CommentRepository,
  FetchCommentsInput,
} from "./comment-repository.interface.js";
import { DEFAULT_COMMENT_STREAM_RECONNECT_INTERVAL_MS } from "../../infrastructure/config/youtube-comment-collection.js";

// 現状は repository の入力型と同一構造だが、層ごとの責務を明確にするため
// usecase 側では意味名を持つ別名型として定義している。
export type CollectYouTubeCommentsInput = FetchCommentsInput;

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
    input: CollectYouTubeCommentsInput,
  ): AsyncIterable<Comment[]> {
    let nextPageToken = input.pageToken;

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
        // streamList 切断時は最後に保持した pageToken から再接続する。
        console.warn(
          "[CollectYouTubeCommentsUseCase] stream disconnected, reconnecting with last pageToken",
          error,
        );
      }

      await this.wait(this.reconnectIntervalMs);
    }
  }
}
