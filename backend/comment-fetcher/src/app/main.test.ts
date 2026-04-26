import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { container } from "tsyringe";
import { runCommentFetcherApp } from "./main.js";
import { YouTubeLiveStreamRepository } from "../adapters/youtube/repository/live-stream.repository.js";
import { YouTubeCommentRepository } from "../adapters/youtube/repository/comment.repository.js";
import { LiveStreamNotFoundError } from "../usecases/live-stream-detection/index.js";

type ResolveFn = typeof container.resolve;

const withMockedResolve = async (
  mockedResolve: ResolveFn,
  body: () => Promise<void>,
): Promise<void> => {
  const originalResolve = container.resolve.bind(container);
  (container as { resolve: ResolveFn }).resolve = mockedResolve;
  try {
    await body();
  } finally {
    (container as { resolve: ResolveFn }).resolve = originalResolve;
  }
};

test("YOUTUBE_TARGET_CHANNEL_ID が未設定なら provider をスキップする", async () => {
  const originalChannelId = process.env.YOUTUBE_TARGET_CHANNEL_ID;
  delete process.env.YOUTUBE_TARGET_CHANNEL_ID;

  const warnings: unknown[][] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    await withMockedResolve(
      ((token: unknown) => {
        if (token === YouTubeLiveStreamRepository) {
          return {
            findLiveStream: async () => null,
          } as unknown as ReturnType<ResolveFn>;
        }
        if (token === YouTubeCommentRepository) {
          return {
            async *streamComments() {},
          } as unknown as ReturnType<ResolveFn>;
        }
        throw new Error("unexpected token");
      }) as ResolveFn,
      async () => {
        await runCommentFetcherApp();
      },
    );
  } finally {
    console.warn = originalWarn;
    if (originalChannelId) {
      process.env.YOUTUBE_TARGET_CHANNEL_ID = originalChannelId;
    }
  }

  assert.equal(warnings.length, 1);
  assert.match(String(warnings[0]?.[0] ?? ""), /is skipped because/);
});

test("LiveStreamNotFoundError はメッセージを出して終了する", async () => {
  const originalChannelId = process.env.YOUTUBE_TARGET_CHANNEL_ID;
  process.env.YOUTUBE_TARGET_CHANNEL_ID = "channel-1";

  const errors: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args);
  };

  try {
    await withMockedResolve(
      ((token: unknown) => {
        if (token === YouTubeLiveStreamRepository) {
          return {
            async findLiveStream() {
              throw new LiveStreamNotFoundError("channel-1", 1);
            },
          } as unknown as ReturnType<ResolveFn>;
        }
        if (token === YouTubeCommentRepository) {
          return {
            async *streamComments() {},
          } as unknown as ReturnType<ResolveFn>;
        }
        throw new Error("unexpected token");
      }) as ResolveFn,
      async () => {
        await runCommentFetcherApp();
      },
    );
  } finally {
    console.error = originalError;
    if (originalChannelId) {
      process.env.YOUTUBE_TARGET_CHANNEL_ID = originalChannelId;
    } else {
      delete process.env.YOUTUBE_TARGET_CHANNEL_ID;
    }
  }

  assert.equal(errors.length, 1);
  assert.match(String(errors[0]?.[0] ?? ""), /live stream not found/);
});
