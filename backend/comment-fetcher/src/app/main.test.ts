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
import type { CommentOutputPort } from "../usecases/comment-collection/comment-collection.interface.js";

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

const noopOutputPort: CommentOutputPort = {
  outputComments: async () => {},
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
        await runCommentFetcherApp(
          { retryOnLiveStreamNotFound: false },
          noopOutputPort,
        );
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

test("YouTube 未認可時は provider をスキップして継続する", async () => {
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
            async resolveOwnChannelId() {
              throw new Error(
                "YouTube access token is missing from AccessTokenProvider.",
              );
            },
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
        await runCommentFetcherApp(
          { retryOnLiveStreamNotFound: false },
          noopOutputPort,
        );
      },
    );
  } finally {
    console.warn = originalWarn;
    if (originalTwitchChannelId) {
      process.env.TWITCH_TARGET_CHANNEL_ID = originalTwitchChannelId;
    } else {
      delete process.env.TWITCH_TARGET_CHANNEL_ID;
    }
  }

  assert.equal(warnings.length, 2);
  const warningTexts = warnings.map((entry) => String(entry[0] ?? ""));
  assert.ok(
    warningTexts.some((text) =>
      /youtube is skipped because authorization is missing/.test(text),
    ),
  );
  assert.ok(
    warningTexts.some((text) => /twitch is skipped because/.test(text)),
  );
});

test("Twitch 未認可時は provider をスキップして継続する", async () => {
  const originalTwitchChannelId = process.env.TWITCH_TARGET_CHANNEL_ID;
  process.env.TWITCH_TARGET_CHANNEL_ID = "target-channel";

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
            async findLiveStream() {
              throw new Error(
                "Twitch access token is missing from AccessTokenProvider.",
              );
            },
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
        await runCommentFetcherApp(
          { retryOnLiveStreamNotFound: false },
          noopOutputPort,
        );
      },
    );
  } finally {
    console.warn = originalWarn;
    if (originalTwitchChannelId) {
      process.env.TWITCH_TARGET_CHANNEL_ID = originalTwitchChannelId;
    } else {
      delete process.env.TWITCH_TARGET_CHANNEL_ID;
    }
  }

  const warningTexts = warnings.map((entry) => String(entry[0] ?? ""));
  assert.ok(
    warningTexts.some((text) =>
      /youtube is skipped because own channel could not be resolved/.test(text),
    ),
  );
  assert.ok(
    warningTexts.some((text) =>
      /twitch is skipped because authorization is missing/.test(text),
    ),
  );
});

test("Twitch トークン失効(401)時は provider をスキップして継続する", async () => {
  const originalTwitchChannelId = process.env.TWITCH_TARGET_CHANNEL_ID;
  process.env.TWITCH_TARGET_CHANNEL_ID = "target-channel";

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
            async findLiveStream() {
              throw new Error(
                'Twitch Helix request failed: 401 Unauthorized {"error":"Unauthorized","status":401,"message":"Invalid OAuth token"}',
              );
            },
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
        await runCommentFetcherApp(
          { retryOnLiveStreamNotFound: false },
          noopOutputPort,
        );
      },
    );
  } finally {
    console.warn = originalWarn;
    if (originalTwitchChannelId) {
      process.env.TWITCH_TARGET_CHANNEL_ID = originalTwitchChannelId;
    } else {
      delete process.env.TWITCH_TARGET_CHANNEL_ID;
    }
  }

  const warningTexts = warnings.map((entry) => String(entry[0] ?? ""));
  assert.ok(
    warningTexts.some((text) =>
      /twitch is skipped because authorization is missing/.test(text),
    ),
  );
});

test("LiveStreamNotFoundError は再試行無効時に警告を出して終了する", async () => {
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
        await runCommentFetcherApp(
          { retryOnLiveStreamNotFound: false },
          noopOutputPort,
        );
      },
    );
  } finally {
    console.warn = originalWarn;
    if (originalTwitchChannelId) {
      process.env.TWITCH_TARGET_CHANNEL_ID = originalTwitchChannelId;
    } else {
      delete process.env.TWITCH_TARGET_CHANNEL_ID;
    }
  }

  const warningTexts = warnings.map((entry) => String(entry[0] ?? ""));
  assert.ok(
    warningTexts.some((text) => /youtube live stream not found/.test(text)),
  );
});

test("options で渡した YouTube channelId を優先して使う", async () => {
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
        await runCommentFetcherApp(
          {
            youtubeTargetChannelId: "input-channel",
            retryOnLiveStreamNotFound: false,
          },
          noopOutputPort,
        );
      },
    );
  } finally {
    console.warn = originalWarn;
    if (originalTwitchChannelId) {
      process.env.TWITCH_TARGET_CHANNEL_ID = originalTwitchChannelId;
    } else {
      delete process.env.TWITCH_TARGET_CHANNEL_ID;
    }
  }

  const notFoundWarning = warnings.find((entry) =>
    /youtube live stream not found/.test(String(entry[0] ?? "")),
  );
  assert.ok(notFoundWarning);
  assert.match(String(notFoundWarning[1] ?? ""), /input-channel/);
});
