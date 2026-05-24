import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { TwitchLiveStreamRepository } from "./live-stream.repository.js";

test("配信中なら配信IDとライブチャットIDを返す", async () => {
  const liveStreamClient = {
    async findLiveStream() {
      return {
        liveStreamId: "stream-1",
        liveChatId: "141981764",
        title: "テスト配信",
      };
    },
  };
  const repository = new TwitchLiveStreamRepository(liveStreamClient);

  const result = await repository.findLiveStream({
    channelId: "twitchdev",
  });

  assert.deepEqual(result, {
    liveStreamId: "stream-1",
    liveChatId: "141981764",
    title: "テスト配信",
  });
});

test("配信中でなければ null を返す", async () => {
  const liveStreamClient = {
    async findLiveStream() {
      return null;
    },
  };
  const repository = new TwitchLiveStreamRepository(liveStreamClient);

  const result = await repository.findLiveStream({
    channelId: "twitchdev",
  });

  assert.equal(result, null);
});
