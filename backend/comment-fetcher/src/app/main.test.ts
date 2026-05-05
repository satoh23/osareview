import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { container } from "tsyringe";
import { runCommentFetcherApp } from "./main.js";
import { YouTubeLiveStreamRepository } from "../adapters/youtube/repository/live-stream.repository.js";
import { YouTubeCommentRepository } from "../adapters/youtube/repository/comment.repository.js";
import { YouTubeLiveStreamClient } from "../adapters/youtube/client/live-stream.client.js";
import { TwitchLiveStreamRepository } from "../adapters/twitch/repository/live-stream.repository.js";
import { TwitchCommentRepository } from "../adapters/twitch/repository/comment.repository.js";
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

test("YouTube自身の channelId を解決できない場合は provider をスキップする", async () => {
  const originalTwitchChannelId = process.env.TWITCH_TARGET_CHANNEL_ID;
  delete process.env.TWITCH_TARGET_CHANNEL_ID;

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
        if (token === YouTubeLiveStreamClient) {
          return {
            resolveOwnChannelId: async () => null,
          } as unknown as ReturnType<ResolveFn>;
        }
        if (token === YouTubeCommentRepository) {
          return {
            async *streamComments() {},
          } as unknown as ReturnType<ResolveFn>;
        }
        if (token === TwitchLiveStreamRepository) {
          return {
            findLiveStream: async () => null,
          } as unknown as ReturnType<ResolveFn>;
        }
        if (token === TwitchCommentRepository) {
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
    if (originalTwitchChannelId) {
      process.env.TWITCH_TARGET_CHANNEL_ID = originalTwitchChannelId;
    }
  }

  assert.equal(warnings.length, 2);
  assert.match(String(warnings[0]?.[0] ?? ""), /is skipped because/);
  assert.match(String(warnings[1]?.[0] ?? ""), /is skipped because/);
});

test("LiveStreamNotFoundError はメッセージを出して終了する", async () => {
  const originalTwitchChannelId = process.env.TWITCH_TARGET_CHANNEL_ID;
  delete process.env.TWITCH_TARGET_CHANNEL_ID;

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
        if (token === YouTubeLiveStreamClient) {
          return {
            resolveOwnChannelId: async () => "channel-1",
          } as unknown as ReturnType<ResolveFn>;
        }
        if (token === YouTubeCommentRepository) {
          return {
            async *streamComments() {},
          } as unknown as ReturnType<ResolveFn>;
        }
        if (token === TwitchLiveStreamRepository) {
          return {
            findLiveStream: async () => null,
          } as unknown as ReturnType<ResolveFn>;
        }
        if (token === TwitchCommentRepository) {
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
    if (originalTwitchChannelId) {
      process.env.TWITCH_TARGET_CHANNEL_ID = originalTwitchChannelId;
    } else {
      delete process.env.TWITCH_TARGET_CHANNEL_ID;
    }
  }

  assert.equal(errors.length, 1);
  assert.match(String(errors[0]?.[0] ?? ""), /live stream not found/);
});

test("options で渡した YouTube channelId を優先して使う", async () => {
  const originalTwitchChannelId = process.env.TWITCH_TARGET_CHANNEL_ID;
  delete process.env.TWITCH_TARGET_CHANNEL_ID;

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
            async findLiveStream(input: { channelId: string }) {
              throw new LiveStreamNotFoundError(input.channelId, 1);
            },
          } as unknown as ReturnType<ResolveFn>;
        }
        if (token === YouTubeLiveStreamClient) {
          return {
            resolveOwnChannelId: async () => "auto-channel",
          } as unknown as ReturnType<ResolveFn>;
        }
        if (token === YouTubeCommentRepository) {
          return {
            async *streamComments() {},
          } as unknown as ReturnType<ResolveFn>;
        }
        if (token === TwitchLiveStreamRepository) {
          return {
            findLiveStream: async () => null,
          } as unknown as ReturnType<ResolveFn>;
        }
        if (token === TwitchCommentRepository) {
          return {
            async *streamComments() {},
          } as unknown as ReturnType<ResolveFn>;
        }
        throw new Error("unexpected token");
      }) as ResolveFn,
      async () => {
        await runCommentFetcherApp({ youtubeTargetChannelId: "input-channel" });
      },
    );
  } finally {
    console.error = originalError;
    if (originalTwitchChannelId) {
      process.env.TWITCH_TARGET_CHANNEL_ID = originalTwitchChannelId;
    } else {
      delete process.env.TWITCH_TARGET_CHANNEL_ID;
    }
  }

  assert.equal(errors.length, 1);
  assert.match(String(errors[0]?.[1] ?? ""), /input-channel/);
});
