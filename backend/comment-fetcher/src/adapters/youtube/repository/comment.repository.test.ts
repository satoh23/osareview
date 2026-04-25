import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { YouTubeCommentRepository } from "./comment.repository.js";
import type { FetchCommentsResult } from "../../../usecases/youtube-comment-collection/comment-repository.interface.js";

test("APIレスポンスを共通コメント配列へ変換しページ情報を返す", async () => {
  const apiClient = {
    async *fetchLiveChatMessages() {
      yield {
        kind: "youtube#liveChatMessageListResponse" as const,
        etag: "etag",
        next_page_token: "next-token",
        items: [
          {
            id: "m1",
            snippet: {
              type: "textMessageEvent" as const,
              live_chat_id: "chat-1",
              author_channel_id: "author-1",
              published_at: "2026-04-25T12:00:00Z",
              has_display_content: true,
              display_message: "hello",
            },
            author_details: {
              channel_id: "author-1",
              display_name: "alice",
            },
          },
        ],
      };
    },
  };

  const repository = new YouTubeCommentRepository(apiClient);
  const results: FetchCommentsResult[] = [];
  for await (const chunk of repository.streamComments({
    liveChatId: "chat-1",
  })) {
    results.push(chunk);
  }
  const result = results[0];

  assert.ok(result);
  assert.equal(result.comments.length, 1);
  assert.equal(result.comments[0]?.id, "m1");
  assert.equal(result.nextPageToken, "next-token");
});
