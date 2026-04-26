import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { YouTubeCommentRepository } from "./comment.repository.js";
import type { FetchCommentsResult } from "../../../usecases/comment-collection/comment-repository.interface.js";

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
              type: "TEXT_MESSAGE_EVENT" as const,
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
      yield {
        kind: "youtube#liveChatMessageListResponse" as const,
        etag: "etag-2",
        next_page_token: "next-token-2",
        items: [
          {
            id: "m2",
            snippet: {
              type: "TEXT_MESSAGE_EVENT" as const,
              live_chat_id: "chat-1",
              author_channel_id: "author-2",
              published_at: "2026-04-25T12:00:01Z",
              has_display_content: true,
              display_message: "world",
            },
            author_details: {
              channel_id: "author-2",
              display_name: "bob",
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
  assert.equal(results.length, 2);
  assert.equal(results[0]?.comments[0]?.id, "m1");
  assert.equal(results[0]?.nextPageToken, "next-token");
  assert.equal(results[1]?.comments[0]?.id, "m2");
  assert.equal(results[1]?.nextPageToken, "next-token-2");
});
