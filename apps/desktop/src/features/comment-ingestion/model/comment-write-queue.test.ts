import { beforeEach, describe, expect, it, vi } from "vitest";

const { withImmediateTransactionMock, persistQueuedCommentWriteMock } =
  vi.hoisted(() => ({
    withImmediateTransactionMock:
      vi.fn<(work: () => Promise<void>) => Promise<void>>(),
    persistQueuedCommentWriteMock: vi.fn<(item: unknown) => Promise<void>>(),
  }));

vi.mock("../../../shared/api/sqlite", () => ({
  withImmediateTransaction: withImmediateTransactionMock,
}));

vi.mock("./persist-queued-comment-write", () => ({
  persistQueuedCommentWrite: persistQueuedCommentWriteMock,
}));

import { CommentWriteQueue } from "./comment-write-queue";
import type { QueuedCommentWrite } from "./types";

function createQueuedCommentWrite(seed: string): QueuedCommentWrite {
  return {
    liveSessionId: 1,
    platform: "youtube",
    platformUserId: `user-${seed}`,
    displayName: `name-${seed}`,
    platformCommentId: `comment-${seed}`,
    commentText: `text-${seed}`,
    commentType: "normal",
    isLowSignal: false,
    commentedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("CommentWriteQueue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    withImmediateTransactionMock.mockImplementation(async (work) => {
      await work();
    });
  });

  it("flush でキュー内アイテムを永続化する", async () => {
    const queue = new CommentWriteQueue();
    const itemA = createQueuedCommentWrite("a");
    const itemB = createQueuedCommentWrite("b");
    queue.enqueue(itemA);
    queue.enqueue(itemB);

    const flushed = await queue.flush();

    expect(flushed).toBe(2);
    expect(withImmediateTransactionMock).toHaveBeenCalledTimes(1);
    expect(persistQueuedCommentWriteMock).toHaveBeenNthCalledWith(1, itemA);
    expect(persistQueuedCommentWriteMock).toHaveBeenNthCalledWith(2, itemB);
    expect(queue.size()).toBe(0);
  });

  it("永続化失敗時にバッチをキュー先頭へ戻す", async () => {
    const queue = new CommentWriteQueue();
    const itemA = createQueuedCommentWrite("a");
    const itemB = createQueuedCommentWrite("b");
    queue.enqueue(itemA);
    queue.enqueue(itemB);

    withImmediateTransactionMock.mockRejectedValueOnce(new Error("boom"));

    await expect(queue.flush()).rejects.toThrow("boom");
    expect(queue.size()).toBe(2);
  });
});
