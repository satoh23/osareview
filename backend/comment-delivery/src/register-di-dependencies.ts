import type { DependencyContainer } from "tsyringe";
import { container } from "tsyringe";
import { DELIVERY_DI_TOKENS } from "./infrastructure/shared/di-tokens.js";
import type { CommentDecorator } from "./usecases/interfaces/comment-decorator.interface.js";
import type { CommentOutputPort } from "./usecases/interfaces/comment-output-port.interface.js";
import { IdentityDecorator } from "./adapters/decorators/identity.decorator.js";
import { ConsoleCommentOutputPort } from "./adapters/output-ports/console-comment.output-port.js";
import { MultiCommentOutputPort } from "./adapters/output-ports/multi-comment.output-port.js";
import { WebSocketCommentOutputPort } from "./adapters/output-ports/websocket-comment.output-port.js";
import {
  EnvWebSocketConfigProvider,
  type WebSocketConfigProvider,
} from "./infrastructure/websocket/config/api-config.js";

export const registerCommentDeliveryDependencies = (
  targetContainer: DependencyContainer = container,
): void => {
  targetContainer.register<CommentDecorator>(
    DELIVERY_DI_TOKENS.commentDecorator,
    {
      useClass: IdentityDecorator,
    },
  );
  targetContainer.registerSingleton<WebSocketConfigProvider>(
    DELIVERY_DI_TOKENS.websocketConfigProvider,
    EnvWebSocketConfigProvider,
  );
  targetContainer.registerSingleton<CommentOutputPort>(
    DELIVERY_DI_TOKENS.commentOutputTarget,
    ConsoleCommentOutputPort,
  );
  targetContainer.registerSingleton<CommentOutputPort>(
    DELIVERY_DI_TOKENS.commentOutputTarget,
    WebSocketCommentOutputPort,
  );
  targetContainer.registerSingleton<CommentOutputPort>(
    DELIVERY_DI_TOKENS.commentOutputPort,
    MultiCommentOutputPort,
  );
};
