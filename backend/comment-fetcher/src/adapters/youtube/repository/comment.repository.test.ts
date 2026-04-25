import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { YouTubeCommentRepository } from "./comment.repository.js";

test("APIレスポンスを共通コメント配列へ変換しページ情報を返す", async () => {
  const apiClient = {
    async fetchLiveChatMessages() {
      return {
        kind: "youtube#liveChatMessageListResponse" as const,
        etag: "etag",
        nextPageToken: "next-token",
        pollingIntervalMillis: 2000,
        items: [
          {
            id: "m1",
            snippet: {
              type: "textMessageEvent" as const,
              liveChatId: "chat-1",
              authorChannelId: "author-1",
              publishedAt: "2026-04-25T12:00:00Z",
              hasDisplayContent: true,
              displayMessage: "hello",
            },
            authorDetails: {
              channelId: "author-1",
              displayName: "alice",
            },
          },
        ],
      };
    },
  };

  const repository = new YouTubeCommentRepository(apiClient);
  const result = await repository.fetchComments({ liveChatId: "chat-1" });

  assert.equal(result.comments.length, 1);
  assert.equal(result.comments[0]?.id, "m1");
  assert.equal(result.nextPageToken, "next-token");
  assert.equal(result.pollingIntervalMillis, 2000);
});
