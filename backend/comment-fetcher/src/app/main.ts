import { container } from "tsyringe";
import { COMMENT_SOURCES } from "@comment-dock/shared";
import type { CommentSource } from "@comment-dock/shared";
import { YouTubeCommentRepository } from "../adapters/youtube/repository/comment.repository.js";
import { YouTubeLiveStreamRepository } from "../adapters/youtube/repository/live-stream.repository.js";
import {
  DetectLiveStreamUseCase,
  LiveStreamNotFoundError,
} from "../usecases/live-stream-detection/index.js";
import { CollectYouTubeCommentsUseCase } from "../usecases/comment-collection/youtube/collect-comments.usecase.js";
import type {
  CollectCommentsInput,
  CollectCommentsStream,
} from "../usecases/comment-collection/comment-collection.types.js";
import type {
  FindLiveStreamInput,
  FindLiveStreamResult,
} from "../usecases/live-stream-detection/live-stream-repository.interface.js";
import { CommentPresenter } from "../adapters/presenters/comment.presenter.js";

type CommentProvider = CommentSource;

const TARGET_CHANNEL_ID_ENV_BY_PROVIDER: Record<CommentProvider, string> = {
  youtube: "YOUTUBE_TARGET_CHANNEL_ID",
  twitch: "TWITCH_TARGET_CHANNEL_ID",
};

type CommentFetchPipeline = {
  provider: CommentProvider;
  findActiveLiveStream: (
    input: FindLiveStreamInput,
  ) => Promise<FindLiveStreamResult>;
  streamCommentsFromLiveChat: (
    input: CollectCommentsInput,
  ) => CollectCommentsStream;
};

const createYouTubePipeline = (): CommentFetchPipeline => {
  const liveStreamRepository = container.resolve(YouTubeLiveStreamRepository);
  const commentRepository = container.resolve(YouTubeCommentRepository);
  const detectLiveStreamUseCase = new DetectLiveStreamUseCase(
    liveStreamRepository,
  );
  const collectCommentsUseCase = new CollectYouTubeCommentsUseCase(
    commentRepository,
  );

  return {
    provider: COMMENT_SOURCES.YOUTUBE,
    findActiveLiveStream: (input) =>
      detectLiveStreamUseCase.findActiveLiveStream(input),
    streamCommentsFromLiveChat: (input) =>
      collectCommentsUseCase.streamCommentsFromLiveChat(input),
  };
};

const resolveTargetChannelId = (provider: CommentProvider): string | null => {
  const envName = TARGET_CHANNEL_ID_ENV_BY_PROVIDER[provider];
  const channelId = process.env[envName];
  if (!channelId) {
    console.warn(
      `[comment-fetcher] ${provider} is skipped because ${envName} is not set.`,
    );
    return null;
  }
  return channelId;
};

const collectComments = async (
  pipeline: CommentFetchPipeline,
  presenter: CommentPresenter,
): Promise<void> => {
  const channelId = resolveTargetChannelId(pipeline.provider);
  if (!channelId) {
    return;
  }

  try {
    const activeLiveStream = await pipeline.findActiveLiveStream({ channelId });
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
      presenter.present(comments);
    }
  } catch (error) {
    if (error instanceof LiveStreamNotFoundError) {
      console.error(
        `[comment-fetcher] ${pipeline.provider} live stream not found`,
        error.message,
      );
      return;
    }
    throw error;
  }
};

/**
 * コメント取得アプリの実行エントリポイント。
 * 有効な provider の収集フローを組み立てて並列実行する。
 */
export const runCommentFetcherApp = async (): Promise<void> => {
  const presenter = new CommentPresenter();
  const pipelines: CommentFetchPipeline[] = [createYouTubePipeline()];
  // Twitch 実装時はここへ createTwitchPipeline() を追加する。

  await Promise.all(
    pipelines.map(async (pipeline) => {
      await collectComments(pipeline, presenter);
    }),
  );
};
