import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { TwitchLiveStreamClient } from "./live-stream.client.js";

test("配信中なら配信IDとライブチャットIDを返す", async () => {
  const calls: string[] = [];
  const client = new TwitchLiveStreamClient({
    async resolveUserIdByLogin(userLogin: string) {
      calls.push(`resolve:${userLogin}`);
      return "141981764";
    },
    async findActiveStream(userId: string) {
      calls.push(`stream:${userId}`);
      return { streamId: "stream-1" };
    },
  } as never);

  const result = await client.findLiveStream({ channelId: "twitchdev" });

  assert.deepEqual(result, {
    liveStreamId: "stream-1",
    liveChatId: "141981764",
  });
  assert.deepEqual(calls, ["resolve:twitchdev", "stream:141981764"]);
});

test("ユーザーが見つからない場合は null を返す", async () => {
  let streamCalled = false;
  const client = new TwitchLiveStreamClient({
    async resolveUserIdByLogin() {
      return null;
    },
    async findActiveStream() {
      streamCalled = true;
      return { streamId: "stream-1" };
    },
  } as never);

  const result = await client.findLiveStream({ channelId: "unknown-user" });

  assert.equal(result, null);
  assert.equal(streamCalled, false);
});

test("配信中ストリームが無い場合は null を返す", async () => {
  const client = new TwitchLiveStreamClient({
    async resolveUserIdByLogin() {
      return "141981764";
    },
    async findActiveStream() {
      return null;
    },
  } as never);

  const result = await client.findLiveStream({ channelId: "twitchdev" });
  assert.equal(result, null);
});
