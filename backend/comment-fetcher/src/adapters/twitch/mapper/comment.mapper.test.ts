import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { mapTwitchChatEventsToComments } from "./comment.mapper.js";
import type {
  TwitchChatMessageEventDto,
  TwitchChatNotificationEventDto,
} from "../dto/raw.dto.js";

function createChatMessageEvent(
  overrides: Partial<TwitchChatMessageEventDto> = {},
): TwitchChatMessageEventDto {
  return {
    broadcaster_user_id: "141981764",
    broadcaster_user_login: "streamer",
    broadcaster_user_name: "Streamer",
    chatter_user_id: "1",
    chatter_user_login: "viewer1",
    chatter_user_name: "Viewer1",
    message_id: "m-1",
    message: { text: "hello", fragments: [] },
    color: "",
    badges: [],
    message_type: "text",
    ...overrides,
  };
}

function createChatNotificationEvent(
  overrides: Partial<TwitchChatNotificationEventDto> = {},
): TwitchChatNotificationEventDto {
  return {
    broadcaster_user_id: "141981764",
    broadcaster_user_login: "streamer",
    broadcaster_user_name: "Streamer",
    chatter_user_id: "2",
    chatter_user_login: "viewer2",
    chatter_user_name: "Viewer2",
    chatter_is_anonymous: false,
    color: "",
    badges: [],
    system_message: "viewer2 subscribed",
    message_id: "n-1",
    message: { text: "", fragments: [] },
    notice_type: "sub",
    ...overrides,
  };
}

function mapSingleEvent(
  event: TwitchChatMessageEventDto | TwitchChatNotificationEventDto,
) {
  return mapTwitchChatEventsToComments([event])[0] ?? null;
}

test("通常チャットは normal へ変換される", () => {
  const result = mapSingleEvent(createChatMessageEvent());
  assert.ok(result);
  assert.equal(result.eventType, "normal");
  assert.equal(result.source, "twitch");
  assert.equal(result.monetaryAmount, undefined);
});

test("bits付きチャットは super_chat へ変換される", () => {
  const result = mapSingleEvent(
    createChatMessageEvent({
      cheer: { bits: 250 },
      message: { text: "cheer250", fragments: [] },
    }),
  );
  assert.ok(result);
  assert.equal(result.eventType, "super_chat");
  assert.deepEqual(result.monetaryAmount, { currency: "BITS", amount: 250 });
});

test("サブスク通知は subscription へ変換される", () => {
  const result = mapSingleEvent(createChatNotificationEvent());
  assert.ok(result);
  assert.equal(result.eventType, "subscription");
});

test("未対応 notice_type は null を返す", () => {
  const result = mapSingleEvent(
    createChatNotificationEvent({
      notice_type: "raid",
    }),
  );
  assert.equal(result, null);
});

test("list変換は null を除外する", () => {
  const result = mapTwitchChatEventsToComments([
    createChatMessageEvent({ message_id: "ok-1" }),
    createChatNotificationEvent({ message_id: "skip-1", notice_type: "raid" }),
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, "ok-1");
});
