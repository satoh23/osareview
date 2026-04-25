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
      type: "textMessageEvent",
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
    ...overrides,
  };
}

test("textMessageEvent は normal へ変換される", () => {
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

test("superChatEvent は monetaryAmount を含む super_chat へ変換される", () => {
  const message = createBaseMessage({
    snippet: {
      type: "superChatEvent",
      liveChatId: "chat-1",
      authorChannelId: "author-1",
      publishedAt: "2026-04-25T12:00:00Z",
      hasDisplayContent: true,
      displayMessage: "thanks",
      superChatDetails: {
        amountMicros: "2500000",
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

test("newSponsorEvent は subscription へ変換される", () => {
  const message = createBaseMessage({
    snippet: {
      type: "newSponsorEvent",
      liveChatId: "chat-1",
      authorChannelId: "author-1",
      publishedAt: "2026-04-25T12:00:00Z",
      hasDisplayContent: true,
      displayMessage: "joined",
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
      liveChatId: "chat-1",
      authorChannelId: "author-1",
      publishedAt: "2026-04-25T12:00:00Z",
      hasDisplayContent: true,
      displayMessage: "unknown",
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
          liveChatId: "chat-1",
          authorChannelId: "author-1",
          publishedAt: "2026-04-25T12:00:00Z",
          hasDisplayContent: true,
          displayMessage: "unknown",
        },
      }),
    ],
  };

  const result = mapYouTubeLiveChatMessagesToComments(response);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, "ok-1");
});
