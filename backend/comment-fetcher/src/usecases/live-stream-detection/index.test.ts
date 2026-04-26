import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { DetectLiveStreamUseCase, LiveStreamNotFoundError } from "./index.js";

test("初回で配信が見つかった場合は即時に返す", async () => {
  const repository = {
    async findLiveStream() {
      return {
        liveStreamId: "live-video-1",
        liveChatId: "chat-1",
      };
    },
  };
  let waitCalls = 0;
  const useCase = new DetectLiveStreamUseCase(repository, 5000, 3, async () => {
    waitCalls += 1;
  });

  const result = await useCase.findActiveLiveStream({
    channelId: "channel-1",
  });

  assert.deepEqual(result, {
    liveStreamId: "live-video-1",
    liveChatId: "chat-1",
  });
  assert.equal(waitCalls, 0);
});

test("途中で配信が見つかるまでポーリングする", async () => {
  let callCount = 0;
  const repository = {
    async findLiveStream() {
      callCount += 1;
      if (callCount < 3) {
        return null;
      }
      return {
        liveStreamId: "live-video-2",
        liveChatId: "chat-2",
      };
    },
  };
  const waitArguments: number[] = [];
  const useCase = new DetectLiveStreamUseCase(
    repository,
    1500,
    5,
    async (milliseconds) => {
      waitArguments.push(milliseconds);
    },
  );

  const result = await useCase.findActiveLiveStream({
    channelId: "channel-1",
  });

  assert.deepEqual(result, {
    liveStreamId: "live-video-2",
    liveChatId: "chat-2",
  });
  assert.equal(callCount, 3);
  assert.deepEqual(waitArguments, [1500, 1500]);
});

test("規定回数で見つからない場合は LiveStreamNotFoundError を投げる", async () => {
  const repository = {
    async findLiveStream() {
      return null;
    },
  };
  let waitCalls = 0;
  const useCase = new DetectLiveStreamUseCase(repository, 1000, 3, async () => {
    waitCalls += 1;
  });

  await assert.rejects(
    () =>
      useCase.findActiveLiveStream({
        channelId: "channel-1",
      }),
    (error: unknown) =>
      error instanceof LiveStreamNotFoundError &&
      error.message.includes('channel "channel-1"') &&
      error.message.includes("3 attempts"),
  );
  assert.equal(waitCalls, 2);
});
