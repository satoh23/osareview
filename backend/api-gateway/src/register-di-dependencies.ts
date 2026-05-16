import { container } from "tsyringe";
import {
  registerCommentFetcherDependencies,
  runTwitchPipeline,
  runYouTubePipeline,
  type PipelineRunOptions,
  type PipelineControlOptions,
  type CommentOutputPort,
} from "@comment-dock/comment-fetcher";
import { registerCommentDeliveryDependencies } from "@comment-dock/comment-delivery";
import { API_GATEWAY_DI_TOKENS } from "./infrastructure/shared/di-tokens.js";
import { NoopSessionStateOutputPort } from "./adapters/output-ports/noop-session-state.output-port.js";
import { HttpControlServer } from "./adapters/http/server.js";
import {
  ManageStreamingSessionsUseCase,
  type SessionPipelineRunner,
} from "./usecases/manage-streaming-sessions.usecase.js";

const youtubePipelineRunner: SessionPipelineRunner = (
  options: PipelineRunOptions,
  outputPort: CommentOutputPort,
  controls: PipelineControlOptions,
) => runYouTubePipeline(options, outputPort, controls);

const twitchPipelineRunner: SessionPipelineRunner = (
  options: PipelineRunOptions,
  outputPort: CommentOutputPort,
  controls: PipelineControlOptions,
) => runTwitchPipeline(options, outputPort, controls);

export const registerApiGatewayDependencies = (): void => {
  // Fetcher / delivery はライブラリとして同一コンテナに登録し、
  // Gateway 側の usecase / server は後続タスクでここに追加していく。
  registerCommentFetcherDependencies();
  registerCommentDeliveryDependencies();
  container.register(API_GATEWAY_DI_TOKENS.sessionStateOutputPort, {
    useClass: NoopSessionStateOutputPort,
  });
  container.register<SessionPipelineRunner>(
    API_GATEWAY_DI_TOKENS.youtubePipelineRunner,
    { useValue: youtubePipelineRunner },
  );
  container.register<SessionPipelineRunner>(
    API_GATEWAY_DI_TOKENS.twitchPipelineRunner,
    { useValue: twitchPipelineRunner },
  );
  container.register(API_GATEWAY_DI_TOKENS.failedSessionResetDelayMs, {
    useValue: 3000,
  });
  container.registerSingleton(ManageStreamingSessionsUseCase);
  container.registerSingleton(HttpControlServer);
};
