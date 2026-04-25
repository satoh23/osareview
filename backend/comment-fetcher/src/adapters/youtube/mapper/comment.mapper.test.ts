import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { mapYouTubeLiveChatMessagesToComments } from "./comment.mapper.js";
import type { YouTubeLiveChatMessageDto } from "../dto/raw.dto.js";

function createBaseMessage(
  overrides: Partial<YouTubeLiveChatMessageDto> = {},
): YouTubeLiveChatMessageDto {
  return {
    id: "msg-1",
    snippet: {
      type: "TEXT_MESSAGE_EVENT",
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
    ...overrides,
  };
}

test("TEXT_MESSAGE_EVENT は normal へ変換される", () => {
  const message = createBaseMessage();
  const result = mapYouTubeLiveChatMessagesToComments({
    kind: "youtube#liveChatMessageListResponse",
    etag: "etag",
    items: [message],
  })[0];

  assert.ok(result);
  assert.equal(result.eventType, "normal");
  assert.equal(result.source, "youtube");
  assert.equal(result.author.id, "author-1");
});

test("SUPER_CHAT_EVENT は monetaryAmount を含む super_chat へ変換される", () => {
  const message = createBaseMessage({
    snippet: {
      type: "SUPER_CHAT_EVENT",
      live_chat_id: "chat-1",
      author_channel_id: "author-1",
      published_at: "2026-04-25T12:00:00Z",
      has_display_content: true,
      display_message: "thanks",
      super_chat_details: {
        amount_micros: "2500000",
        currency: "JPY",
      },
    },
  });

  const result = mapYouTubeLiveChatMessagesToComments({
    kind: "youtube#liveChatMessageListResponse",
    etag: "etag",
    items: [message],
  })[0];
  assert.ok(result);
  assert.equal(result.eventType, "super_chat");
  assert.deepEqual(result.monetaryAmount, { currency: "JPY", amount: 2.5 });
});

test("NEW_SPONSOR_EVENT は subscription へ変換される", () => {
  const message = createBaseMessage({
    snippet: {
      type: "NEW_SPONSOR_EVENT",
      live_chat_id: "chat-1",
      author_channel_id: "author-1",
      published_at: "2026-04-25T12:00:00Z",
      has_display_content: true,
      display_message: "joined",
    },
  });

  const result = mapYouTubeLiveChatMessagesToComments({
    kind: "youtube#liveChatMessageListResponse",
    etag: "etag",
    items: [message],
  })[0];
  assert.ok(result);
  assert.equal(result.eventType, "subscription");
});

test("未知のメッセージ種別は null を返す", () => {
  const message = createBaseMessage({
    snippet: {
      type: "unknownNewType",
      live_chat_id: "chat-1",
      author_channel_id: "author-1",
      published_at: "2026-04-25T12:00:00Z",
      has_display_content: true,
      display_message: "unknown",
    },
  });

  const result = mapYouTubeLiveChatMessagesToComments({
    kind: "youtube#liveChatMessageListResponse",
    etag: "etag",
    items: [message],
  });
  assert.equal(result.length, 0);
});

test("list 変換は null を除外する", () => {
  const response = {
    kind: "youtube#liveChatMessageListResponse" as const,
    etag: "etag",
    items: [
      createBaseMessage({ id: "ok-1" }),
      createBaseMessage({
        id: "skip-1",
        snippet: {
          type: "unknownNewType",
          live_chat_id: "chat-1",
          author_channel_id: "author-1",
          published_at: "2026-04-25T12:00:00Z",
          has_display_content: true,
          display_message: "unknown",
        },
      }),
    ],
  };

  const result = mapYouTubeLiveChatMessagesToComments(response);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, "ok-1");
});
