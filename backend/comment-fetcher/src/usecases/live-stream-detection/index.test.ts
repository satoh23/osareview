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
        title: "テスト配信",
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
    title: "テスト配信",
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
        title: null,
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
    title: null,
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
      error.message.includes("配信が見つかりませんでした"),
  );
  assert.equal(waitCalls, 2);
});

test("AbortSignal が中断済みの場合は repository を呼ばずに中断する", async () => {
  let callCount = 0;
  const repository = {
    async findLiveStream() {
      callCount += 1;
      return null;
    },
  };
  const controller = new AbortController();
  controller.abort();
  const useCase = new DetectLiveStreamUseCase(repository, 1000, 3);

  await assert.rejects(
    () =>
      useCase.findActiveLiveStream(
        {
          channelId: "channel-1",
        },
        { signal: controller.signal },
      ),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError",
  );
  assert.equal(callCount, 0);
});

test("ポーリング待機中の AbortSignal 中断を呼び出し元へ伝播する", async () => {
  const repository = {
    async findLiveStream() {
      return null;
    },
  };
  const controller = new AbortController();
  let waitCalls = 0;
  const useCase = new DetectLiveStreamUseCase(
    repository,
    1000,
    3,
    async (_milliseconds, signal) => {
      waitCalls += 1;
      assert.equal(signal, controller.signal);
      controller.abort();
      signal?.throwIfAborted();
    },
  );

  await assert.rejects(
    () =>
      useCase.findActiveLiveStream(
        {
          channelId: "channel-1",
        },
        { signal: controller.signal },
      ),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError",
  );
  assert.equal(waitCalls, 1);
});
