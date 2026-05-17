import { container } from "tsyringe";
import { setTimeout as sleep } from "node:timers/promises";
import { NotAuthorizedError } from "@comment-dock/auth";
import { COMMENT_SOURCES, SESSION_STATES } from "@comment-dock/shared";
import type {
  CommentSource,
  SessionPlatform,
  SessionState,
} from "@comment-dock/shared";
import { YouTubeCommentRepository } from "../adapters/youtube/repository/comment.repository.js";
import { YouTubeLiveStreamRepository } from "../adapters/youtube/repository/live-stream.repository.js";
import { YouTubeLiveStreamClient } from "../adapters/youtube/client/live-stream.client.js";
import { TwitchCommentRepository } from "../adapters/twitch/repository/comment.repository.js";
import { TwitchLiveStreamRepository } from "../adapters/twitch/repository/live-stream.repository.js";
import {
  DetectLiveStreamUseCase,
  LiveStreamNotFoundError,
} from "../usecases/live-stream-detection/index.js";
import { CollectYouTubeCommentsUseCase } from "../usecases/comment-collection/youtube/collect-comments.usecase.js";
import { CollectTwitchCommentsUseCase } from "../usecases/comment-collection/twitch/collect-comments.usecase.js";
import type {
  CollectCommentsInput,
  CollectCommentsStream,
} from "../usecases/comment-collection/comment-collection.types.js";
import type { CommentOutputPort } from "../usecases/comment-collection/comment-collection.interface.js";
import type {
  FindLiveStreamInput,
  FindLiveStreamResult,
} from "../usecases/live-stream-detection/live-stream-repository.interface.js";
import { getLiveStreamPollingIntervalMs } from "../infrastructure/shared/config/live-stream-detection.js";

type CommentProvider = CommentSource;

export type RunCommentFetcherAppOptions = {
  youtubeTargetChannelId?: string;
  retryOnLiveStreamNotFound?: boolean;
  liveStreamRetryIntervalMs?: number;
};

// NOTE: 単発パイプライン用の公開名を先に分けておく。
// 現状は既存アプリ実行オプションと同じだが、Gateway 側からの利用が増えた時に
// runCommentFetcherApp と別のオプション形へ切り出しやすくするため alias にしている。
export type PipelineRunOptions = RunCommentFetcherAppOptions;

export type SessionStateChangeEvent = {
  platform: SessionPlatform;
  state: SessionState;
  reason?: string;
};

export type PipelineControlOptions = {
  signal?: AbortSignal;
  onStateChange?: (event: SessionStateChangeEvent) => void | Promise<void>;
};

type ResolvedPipelineRunOptions = Required<
  Pick<
    RunCommentFetcherAppOptions,
    "retryOnLiveStreamNotFound" | "liveStreamRetryIntervalMs"
  >
>;

type CommentFetchPipeline = {
  provider: CommentProvider & SessionPlatform;
  resolveTargetChannelId: () => Promise<string | null>;
  findCurrentLiveStream: (
    input: FindLiveStreamInput,
  ) => Promise<FindLiveStreamResult | null>;
  findActiveLiveStream: (
    input: FindLiveStreamInput,
    options?: { signal?: AbortSignal },
  ) => Promise<FindLiveStreamResult>;
  streamCommentsFromLiveChat: (
    input: CollectCommentsInput,
  ) => CollectCommentsStream;
};

class LiveStreamEndedError extends Error {
  constructor() {
    super("Live stream has ended.");
    this.name = "LiveStreamEndedError";
  }
}

const isAuthorizationMissingError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error instanceof NotAuthorizedError ||
    /access token is missing from AccessTokenProvider\./.test(error.message) ||
    /Twitch Helix request failed: 401 Unauthorized/.test(error.message) ||
    /Invalid OAuth token/.test(error.message)
  );
};

const isLiveStreamEndedError = (error: unknown): boolean =>
  error instanceof LiveStreamEndedError;

const isAbortError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.name === "AbortError";
};

const linkAbortSignal = (
  source: AbortSignal | undefined,
  target: AbortController,
): (() => void) => {
  if (!source) {
    return () => {};
  }

  if (source.aborted) {
    target.abort(source.reason);
    return () => {};
  }

  const onAbort = (): void => {
    target.abort(source.reason);
  };
  source.addEventListener("abort", onAbort, { once: true });
  return () => {
    source.removeEventListener("abort", onAbort);
  };
};

const monitorLiveStreamEnd = async (
  pipeline: CommentFetchPipeline,
  input: {
    channelId: string;
    liveStreamId: string;
  },
  intervalMs: number,
  signal: AbortSignal,
): Promise<void> => {
  while (true) {
    await waitForRetry(intervalMs, signal);
    signal.throwIfAborted();

    const currentLiveStream = await pipeline.findCurrentLiveStream({
      channelId: input.channelId,
    });
    if (
      !currentLiveStream ||
      currentLiveStream.liveStreamId !== input.liveStreamId
    ) {
      throw new LiveStreamEndedError();
    }
  }
};

const emitStateChange = async (
  pipeline: CommentFetchPipeline,
  controls: PipelineControlOptions,
  state: SessionState,
  reason?: string,
): Promise<void> => {
  await controls.onStateChange?.({
    platform: pipeline.provider,
    state,
    ...(reason ? { reason } : {}),
  });
};

const waitForRetry = async (
  milliseconds: number,
  signal?: AbortSignal,
): Promise<void> => {
  await sleep(milliseconds, undefined, { signal });
};

const nextWithAbort = async <T>(
  iterator: AsyncIterator<T>,
  signal?: AbortSignal,
): Promise<IteratorResult<T>> => {
  if (!signal) {
    return iterator.next();
  }

  signal.throwIfAborted();

  // for await...of では next() 待機中の AbortSignal を直接扱えないため、
  // iterator.next() と abort 通知を競争させて停止操作に即時反応できるようにする。
  let removeAbortListener: (() => void) | undefined;
  const abortPromise = new Promise<never>((_, reject) => {
    const onAbort = (): void => {
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    removeAbortListener = () => {
      signal.removeEventListener("abort", onAbort);
    };
  });

  try {
    return await Promise.race([iterator.next(), abortPromise]);
  } finally {
    removeAbortListener?.();
  }
};

// 外部入力の optional な実行設定を、collectComments が扱う必須設定へ解決する。
// 既存の runCommentFetcherApp は常駐プロセス互換で再検知あり、
// 単発パイプラインはボタン起点の実行なので再検知なしを既定にするため、
// retry の既定値だけ呼び出し元から渡せるようにしている。
const resolveRuntimeOptions = (
  options: RunCommentFetcherAppOptions,
  defaultRetryOnLiveStreamNotFound: boolean,
): ResolvedPipelineRunOptions => ({
  retryOnLiveStreamNotFound:
    options.retryOnLiveStreamNotFound ?? defaultRetryOnLiveStreamNotFound,
  liveStreamRetryIntervalMs:
    options.liveStreamRetryIntervalMs ?? getLiveStreamPollingIntervalMs(),
});

const createYouTubePipeline = (
  options: RunCommentFetcherAppOptions,
): CommentFetchPipeline => {
  const liveStreamRepository = container.resolve(YouTubeLiveStreamRepository);
  const liveStreamClient = container.resolve(YouTubeLiveStreamClient);
  const commentRepository = container.resolve(YouTubeCommentRepository);
  const detectLiveStreamUseCase = new DetectLiveStreamUseCase(
    liveStreamRepository,
  );
  const collectCommentsUseCase = new CollectYouTubeCommentsUseCase(
    commentRepository,
  );

  return {
    provider: COMMENT_SOURCES.YOUTUBE,
    resolveTargetChannelId: async () => {
      if (options.youtubeTargetChannelId) {
        return options.youtubeTargetChannelId;
      }

      const ownChannelId = await liveStreamClient.resolveOwnChannelId();
      if (!ownChannelId) {
        console.warn(
          "[comment-fetcher] youtube is skipped because own channel could not be resolved from authenticated account.",
        );
        return null;
      }
      console.info(
        "[comment-fetcher] youtube channel is resolved from authenticated account.",
        { channelId: ownChannelId },
      );
      return ownChannelId;
    },
    findCurrentLiveStream: (input) =>
      liveStreamRepository.findLiveStream(input),
    findActiveLiveStream: (input, findOptions) =>
      detectLiveStreamUseCase.findActiveLiveStream(input, findOptions),
    streamCommentsFromLiveChat: (input) =>
      collectCommentsUseCase.streamCommentsFromLiveChat(input),
  };
};

const createTwitchPipeline = (): CommentFetchPipeline => {
  const liveStreamRepository = container.resolve(TwitchLiveStreamRepository);
  const commentRepository = container.resolve(TwitchCommentRepository);
  const detectLiveStreamUseCase = new DetectLiveStreamUseCase(
    liveStreamRepository,
  );
  const collectCommentsUseCase = new CollectTwitchCommentsUseCase(
    commentRepository,
  );

  return {
    provider: COMMENT_SOURCES.TWITCH,
    resolveTargetChannelId: async () => {
      const channelId = process.env.TWITCH_TARGET_CHANNEL_ID;
      if (!channelId) {
        console.warn(
          "[comment-fetcher] twitch is skipped because TWITCH_TARGET_CHANNEL_ID is not set.",
        );
        return null;
      }
      return channelId;
    },
    findCurrentLiveStream: (input) =>
      liveStreamRepository.findLiveStream(input),
    findActiveLiveStream: (input, findOptions) =>
      detectLiveStreamUseCase.findActiveLiveStream(input, findOptions),
    streamCommentsFromLiveChat: (input) =>
      collectCommentsUseCase.streamCommentsFromLiveChat(input),
  };
};

const collectComments = async (
  pipeline: CommentFetchPipeline,
  outputPort: CommentOutputPort,
  options: ResolvedPipelineRunOptions,
  controls: PipelineControlOptions = {},
): Promise<void> => {
  while (true) {
    try {
      controls.signal?.throwIfAborted();
      await emitStateChange(pipeline, controls, SESSION_STATES.CONNECTING);
      const channelId = await pipeline.resolveTargetChannelId();
      if (!channelId) {
        await emitStateChange(
          pipeline,
          controls,
          SESSION_STATES.FAILED,
          "Target channel could not be resolved.",
        );
        return;
      }

      const activeLiveStream = await pipeline.findActiveLiveStream(
        {
          channelId,
        },
        { signal: controls.signal },
      );
      console.info(
        `[comment-fetcher] ${pipeline.provider} live stream detected`,
        {
          channelId,
          liveChatId: activeLiveStream.liveChatId,
        },
      );
      await emitStateChange(pipeline, controls, SESSION_STATES.CONNECTED);

      const commentStream = pipeline.streamCommentsFromLiveChat({
        liveChatId: activeLiveStream.liveChatId,
        retryOnStreamEnd: options.retryOnLiveStreamNotFound,
      });
      const commentIterator = commentStream[Symbol.asyncIterator]();
      const streamMonitorController = new AbortController();
      const unlinkAbortSignal = linkAbortSignal(
        controls.signal,
        streamMonitorController,
      );
      const streamMonitor = monitorLiveStreamEnd(
        pipeline,
        {
          channelId,
          liveStreamId: activeLiveStream.liveStreamId,
        },
        options.liveStreamRetryIntervalMs,
        streamMonitorController.signal,
      ).catch((error: unknown) => {
        if (streamMonitorController.signal.aborted) {
          return;
        }
        streamMonitorController.abort(error);
      });
      try {
        while (true) {
          const nextComments = await nextWithAbort(
            commentIterator,
            streamMonitorController.signal,
          );
          if (nextComments.done) {
            break;
          }

          controls.signal?.throwIfAborted();
          await outputPort.outputComments(nextComments.value);
        }
      } finally {
        const streamEnded = isLiveStreamEndedError(
          streamMonitorController.signal.reason,
        );
        streamMonitorController.abort();
        unlinkAbortSignal();
        await streamMonitor;
        const closeCommentIterator = commentIterator.return?.();
        if (streamEnded) {
          void closeCommentIterator?.catch(() => {});
        } else {
          await closeCommentIterator;
        }
      }

      // 配信終了などでストリームが自然終了した場合は待機して再検知する。
      // テストでは無限待機を避けるため、ここで明示的に終了できるようにする。
      if (!options.retryOnLiveStreamNotFound) {
        await emitStateChange(pipeline, controls, SESSION_STATES.IDLE);
        return;
      }
      await waitForRetry(options.liveStreamRetryIntervalMs, controls.signal);
    } catch (error) {
      if (isLiveStreamEndedError(error)) {
        await emitStateChange(pipeline, controls, SESSION_STATES.IDLE);
        return;
      }
      if (controls.signal?.aborted || isAbortError(error)) {
        await emitStateChange(pipeline, controls, SESSION_STATES.IDLE);
        return;
      }
      if (isAuthorizationMissingError(error)) {
        console.warn(
          `[comment-fetcher] ${pipeline.provider} is skipped because authorization is missing.`,
        );
        await emitStateChange(
          pipeline,
          controls,
          SESSION_STATES.FAILED,
          error instanceof Error ? error.message : String(error),
        );
        return;
      }
      if (error instanceof LiveStreamNotFoundError) {
        console.warn(
          `[comment-fetcher] ${pipeline.provider} live stream not found`,
          error.message,
        );
        await emitStateChange(
          pipeline,
          controls,
          SESSION_STATES.FAILED,
          error.message,
        );
        if (!options.retryOnLiveStreamNotFound) {
          return;
        }
        await waitForRetry(options.liveStreamRetryIntervalMs, controls.signal);
        continue;
      }
      throw error;
    }
  }
};

export const runYouTubePipeline = async (
  options: PipelineRunOptions,
  outputPort: CommentOutputPort,
  controls: PipelineControlOptions = {},
): Promise<void> => {
  await collectComments(
    createYouTubePipeline(options),
    outputPort,
    resolveRuntimeOptions(options, false),
    controls,
  );
};

export const runTwitchPipeline = async (
  options: PipelineRunOptions,
  outputPort: CommentOutputPort,
  controls: PipelineControlOptions = {},
): Promise<void> => {
  await collectComments(
    createTwitchPipeline(),
    outputPort,
    resolveRuntimeOptions(options, false),
    controls,
  );
};

/**
 * コメント取得アプリの実行エントリポイント。
 * 有効な provider の収集フローを組み立てて並列実行する。
 */
export const runCommentFetcherApp = async (
  options: RunCommentFetcherAppOptions = {},
  outputPort: CommentOutputPort,
): Promise<void> => {
  const runtimeOptions = resolveRuntimeOptions(options, true);

  const pipelines: CommentFetchPipeline[] = [
    createYouTubePipeline(options),
    createTwitchPipeline(),
  ];

  await Promise.all(
    pipelines.map(async (pipeline) => {
      await collectComments(pipeline, outputPort, runtimeOptions);
    }),
  );
};
