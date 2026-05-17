import { container } from "tsyringe";
import { createAuthClient, type AuthClient } from "@comment-dock/auth";
import {
  registerCommentFetcherDependencies,
  runTwitchPipeline,
  runYouTubePipeline,
  type PipelineRunOptions,
  type PipelineControlOptions,
  type CommentOutputPort,
} from "@comment-dock/comment-fetcher";
import {
  ConsoleCommentOutputPort,
  DecorationPipeline,
  DeliverCommentsUseCase,
  DELIVERY_DI_TOKENS,
  IdentityDecorator,
  MultiCommentOutputPort,
  type CommentDecorator,
  type CommentOutputPort as DeliveryCommentOutputPort,
} from "@comment-dock/comment-delivery";
import { API_GATEWAY_DI_TOKENS } from "./infrastructure/shared/di-tokens.js";
import { HttpControlServer } from "./adapters/http/server.js";
import { WebSocketCommentOutputPort } from "./adapters/ws/websocket-comment.output-port.js";
import {
  ManageStreamingSessionsUseCase,
  type SessionPipelineRunner,
} from "./usecases/manage-streaming-sessions.usecase.js";
import { ManageAccountLinksUseCase } from "./usecases/manage-account-links.usecase.js";
import type { SessionStateOutputPort } from "./usecases/interfaces/session-state-output-port.interface.js";
import type { AccountStateOutputPort } from "./usecases/interfaces/account-state-output-port.interface.js";

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
  // auth / fetcher / delivery は Gateway プロセスの同一コンテナで束ねる。
  // fetcher には Gateway 管理下の AuthClient を渡し、認証経路を一元化する。
  const authClient = createAuthClient();
  container.register<AuthClient>(API_GATEWAY_DI_TOKENS.authClient, {
    useValue: authClient,
  });
  registerCommentFetcherDependencies({ authClient });
  registerGatewayCommentDeliveryDependencies();
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
  container.registerSingleton(ManageAccountLinksUseCase);
  container.registerSingleton(HttpControlServer);
};

const registerGatewayCommentDeliveryDependencies = (): void => {
  container.register<CommentDecorator>(DELIVERY_DI_TOKENS.commentDecorator, {
    useClass: IdentityDecorator,
  });
  container.registerSingleton(WebSocketCommentOutputPort);
  container.registerSingleton<DeliveryCommentOutputPort>(
    DELIVERY_DI_TOKENS.commentOutputTarget,
    ConsoleCommentOutputPort,
  );
  container.register<DeliveryCommentOutputPort>(
    DELIVERY_DI_TOKENS.commentOutputTarget,
    {
      useFactory: (dependencyContainer) =>
        dependencyContainer.resolve(WebSocketCommentOutputPort),
    },
  );
  container.registerSingleton<DeliveryCommentOutputPort>(
    DELIVERY_DI_TOKENS.commentOutputPort,
    MultiCommentOutputPort,
  );
  container.registerSingleton(DecorationPipeline);
  container.registerSingleton(DeliverCommentsUseCase);
  container.register<SessionStateOutputPort>(
    API_GATEWAY_DI_TOKENS.sessionStateOutputPort,
    {
      useFactory: (dependencyContainer) =>
        dependencyContainer.resolve(WebSocketCommentOutputPort),
    },
  );
  container.register<AccountStateOutputPort>(
    API_GATEWAY_DI_TOKENS.accountStateOutputPort,
    {
      useFactory: (dependencyContainer) =>
        dependencyContainer.resolve(WebSocketCommentOutputPort),
    },
  );
};
