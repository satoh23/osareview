import { WebSocketServer } from "ws";
import { WebSocket } from "ws";
import {
  COMMENT_DELIVERY_MESSAGE_TYPES,
  type CommentViewDto,
  type CommentsAppendMessage,
} from "@comment-dock/shared";
import { inject, injectable } from "tsyringe";
import type { CommentOutputPort } from "../../usecases/interfaces/comment-output-port.interface.js";
import type { WebSocketConfigProvider } from "../../infrastructure/websocket/config/api-config.js";
import { DELIVERY_DI_TOKENS } from "../../infrastructure/shared/di-tokens.js";

@injectable()
export class WebSocketCommentOutputPort implements CommentOutputPort {
  private server: WebSocketServer | null = null;

  constructor(
    @inject(DELIVERY_DI_TOKENS.websocketConfigProvider)
    private readonly configProvider: WebSocketConfigProvider,
  ) {}

  async outputToUi(comments: CommentViewDto[]): Promise<void> {
    await this.ensureServerStarted();
    if (!this.server) return;

    for (const comment of comments) {
      const message: CommentsAppendMessage = {
        type: COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_APPEND,
        payload: { comment },
      };
      const encoded = JSON.stringify(message);
      for (const client of this.server.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(encoded);
        }
      }
    }
  }

  async close(): Promise<void> {
    if (!this.server) return;

    const target = this.server;
    this.server = null;
    await new Promise<void>((resolve, reject) => {
      target.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private async ensureServerStarted(): Promise<void> {
    if (this.server) return;
    const endpoint = this.configProvider.getEndpoint();
    const server = new WebSocketServer({
      host: endpoint.host,
      port: endpoint.port,
    });
    await new Promise<void>((resolve, reject) => {
      server.once("listening", () => resolve());
      server.once("error", (error) => reject(error));
    });
    this.server = server;
  }
}
