import { container } from "tsyringe";
import type { AuthClient } from "@comment-dock/auth";
import { HttpControlServer } from "../adapters/http/server.js";
import { WebSocketCommentOutputPort } from "../adapters/ws/websocket-comment.output-port.js";
import { ManageAccountLinksUseCase } from "../usecases/manage-account-links.usecase.js";
import { API_GATEWAY_DI_TOKENS } from "../infrastructure/shared/di-tokens.js";

type ApiGatewaySignal = Extract<NodeJS.Signals, "SIGINT" | "SIGTERM">;

/**
 * 起動処理が実際に使う操作だけに依存を絞り、テストで軽い stub を渡しやすくする。
 */
type RuntimeHttpControlServer = Pick<HttpControlServer, "close" | "start">;

/**
 * WebSocket 出力も start/close だけに絞り、実サーバを立てずに起動順を検証できるようにする。
 */
type RuntimeWebSocketOutputPort = Pick<
  WebSocketCommentOutputPort,
  "close" | "start"
>;

/**
 * account link 起動処理に必要な操作だけを型にし、auth 通知との接続を単体でテストしやすくする。
 */
type RuntimeManageAccountLinksUseCase = Pick<
  ManageAccountLinksUseCase,
  "initialize" | "markAsUnlinked"
>;

/**
 * runApiGateway の外部依存をまとめた境界。
 * 本番では DI で解決し、テストでは process signal や各 server を stub に差し替える。
 */
type ApiGatewayRuntimeDeps = {
  authClient: AuthClient;
  httpControlServer: RuntimeHttpControlServer;
  manageAccountLinksUseCase: RuntimeManageAccountLinksUseCase;
  onSignal(signal: ApiGatewaySignal, handler: () => void): void;
  webSocketCommentOutputPort: RuntimeWebSocketOutputPort;
};

/**
 * 本番起動時に tsyringe container と process signal から実依存を組み立てる。
 */
const resolveRuntimeDeps = (): ApiGatewayRuntimeDeps => ({
  authClient: container.resolve<AuthClient>(API_GATEWAY_DI_TOKENS.authClient),
  httpControlServer: container.resolve(HttpControlServer),
  manageAccountLinksUseCase: container.resolve(ManageAccountLinksUseCase),
  onSignal(signal, handler) {
    process.once(signal, handler);
  },
  webSocketCommentOutputPort: container.resolve(WebSocketCommentOutputPort),
});

export const runApiGateway = async (
  deps: ApiGatewayRuntimeDeps = resolveRuntimeDeps(),
): Promise<void> => {
  const {
    authClient,
    httpControlServer,
    manageAccountLinksUseCase,
    onSignal,
    webSocketCommentOutputPort,
  } = deps;

  await manageAccountLinksUseCase.initialize();
  const unsubscribeAuthorizationLost = authClient.onAuthorizationLost(
    (event) => {
      void manageAccountLinksUseCase
        .markAsUnlinked(event.provider, event.reason)
        .catch((error: unknown) => {
          console.error(
            "[api-gateway] failed to handle authorization lost",
            error,
          );
        });
    },
  );
  await webSocketCommentOutputPort.start();
  await httpControlServer.start();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    console.info(`[api-gateway] received ${signal}, shutting down`);
    unsubscribeAuthorizationLost();
    await Promise.all([
      httpControlServer.close(),
      webSocketCommentOutputPort.close(),
    ]);
  };

  onSignal("SIGINT", () => {
    void shutdown("SIGINT");
  });
  onSignal("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};
