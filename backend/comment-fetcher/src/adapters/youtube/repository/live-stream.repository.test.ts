import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { YouTubeLiveStreamRepository } from "./live-stream.repository.js";

test("配信中なら配信IDとライブチャットIDを返す", async () => {
  const liveStreamClient = {
    async findLiveStream() {
      return {
        liveStreamId: "live-video-1",
        liveChatId: "chat-1",
      };
    },
  };
  const repository = new YouTubeLiveStreamRepository(liveStreamClient);

  const result = await repository.findLiveStream({
    channelId: "channel-1",
  });

  assert.deepEqual(result, {
    liveStreamId: "live-video-1",
    liveChatId: "chat-1",
  });
});

test("配信中でなければ null を返す", async () => {
  const liveStreamClient = {
    async findLiveStream() {
      return null;
    },
  };
  const repository = new YouTubeLiveStreamRepository(liveStreamClient);

  const result = await repository.findLiveStream({
    channelId: "channel-1",
  });

  assert.equal(result, null);
});
