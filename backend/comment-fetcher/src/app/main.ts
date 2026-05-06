import { container } from "tsyringe";
import { setTimeout as sleep } from "node:timers/promises";
import { COMMENT_SOURCES } from "@comment-dock/shared";
import type { CommentSource } from "@comment-dock/shared";
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
import { DEFAULT_LIVE_STREAM_POLLING_INTERVAL_MS } from "../infrastructure/shared/config/live-stream-detection.js";

type CommentProvider = CommentSource;

export type RunCommentFetcherAppOptions = {
  youtubeTargetChannelId?: string;
  retryOnLiveStreamNotFound?: boolean;
  liveStreamRetryIntervalMs?: number;
};

type CommentFetchPipeline = {
  provider: CommentProvider;
  resolveTargetChannelId: () => Promise<string | null>;
  findActiveLiveStream: (
    input: FindLiveStreamInput,
  ) => Promise<FindLiveStreamResult>;
  streamCommentsFromLiveChat: (
    input: CollectCommentsInput,
  ) => CollectCommentsStream;
};

const isAuthorizationMissingError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  return /access token is missing from AccessTokenProvider\./.test(
    error.message,
  );
};

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
    findActiveLiveStream: (input) =>
      detectLiveStreamUseCase.findActiveLiveStream(input),
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
    findActiveLiveStream: (input) =>
      detectLiveStreamUseCase.findActiveLiveStream(input),
    streamCommentsFromLiveChat: (input) =>
      collectCommentsUseCase.streamCommentsFromLiveChat(input),
  };
};

const collectComments = async (
  pipeline: CommentFetchPipeline,
  outputPort: CommentOutputPort,
  options: Required<
    Pick<
      RunCommentFetcherAppOptions,
      "retryOnLiveStreamNotFound" | "liveStreamRetryIntervalMs"
    >
  >,
): Promise<void> => {
  while (true) {
    try {
      const channelId = await pipeline.resolveTargetChannelId();
      if (!channelId) {
        return;
      }

      const activeLiveStream = await pipeline.findActiveLiveStream({
        channelId,
      });
      console.info(
        `[comment-fetcher] ${pipeline.provider} live stream detected`,
        {
          channelId,
          liveChatId: activeLiveStream.liveChatId,
        },
      );

      for await (const comments of pipeline.streamCommentsFromLiveChat({
        liveChatId: activeLiveStream.liveChatId,
      })) {
        await outputPort.outputComments(comments);
      }

      // 配信終了などでストリームが自然終了した場合は待機して再検知する。
      // テストでは無限待機を避けるため、ここで明示的に終了できるようにする。
      if (!options.retryOnLiveStreamNotFound) {
        return;
      }
      await sleep(options.liveStreamRetryIntervalMs);
    } catch (error) {
      if (isAuthorizationMissingError(error)) {
        console.warn(
          `[comment-fetcher] ${pipeline.provider} is skipped because authorization is missing.`,
        );
        return;
      }
      if (error instanceof LiveStreamNotFoundError) {
        console.warn(
          `[comment-fetcher] ${pipeline.provider} live stream not found`,
          error.message,
        );
        if (!options.retryOnLiveStreamNotFound) {
          return;
        }
        await sleep(options.liveStreamRetryIntervalMs);
        continue;
      }
      throw error;
    }
  }
};

/**
 * コメント取得アプリの実行エントリポイント。
 * 有効な provider の収集フローを組み立てて並列実行する。
 */
export const runCommentFetcherApp = async (
  options: RunCommentFetcherAppOptions = {},
  outputPort: CommentOutputPort,
): Promise<void> => {
  const runtimeOptions = {
    retryOnLiveStreamNotFound: options.retryOnLiveStreamNotFound ?? true,
    liveStreamRetryIntervalMs:
      options.liveStreamRetryIntervalMs ??
      DEFAULT_LIVE_STREAM_POLLING_INTERVAL_MS,
  };

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
