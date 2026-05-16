import { container } from "tsyringe";
import { HttpControlServer } from "../adapters/http/server.js";
import { WebSocketCommentOutputPort } from "../adapters/ws/websocket-comment.output-port.js";

export const runApiGateway = async (): Promise<void> => {
  const httpControlServer = container.resolve(HttpControlServer);
  const webSocketCommentOutputPort = container.resolve(
    WebSocketCommentOutputPort,
  );

  await webSocketCommentOutputPort.start();
  await httpControlServer.start();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    console.info(`[api-gateway] received ${signal}, shutting down`);
    await Promise.all([
      httpControlServer.close(),
      webSocketCommentOutputPort.close(),
    ]);
  };

  process.once("SIGINT", () => {
    void shutdown("SIGINT");
  });
  process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};
