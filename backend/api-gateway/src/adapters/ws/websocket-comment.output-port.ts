import { WebSocket, WebSocketServer } from "ws";
import { injectable } from "tsyringe";
import {
  COMMENT_DELIVERY_MESSAGE_TYPES,
  SESSION_PLATFORMS,
  SESSION_STATES,
  type CommentDeliveryMessage,
  type CommentViewDto,
  type CommentsAppendMessage,
  type SessionStateMessage,
  type StreamingSessionSnapshots,
} from "@comment-dock/shared";
import type { CommentOutputPort } from "@comment-dock/comment-delivery";
import {
  getWebSocketApiEndpoint,
  type WebSocketApiEndpoint,
} from "../../infrastructure/websocket/config/api-config.js";
import type {
  SessionStateOutputEvent,
  SessionStateOutputPort,
} from "../../usecases/interfaces/session-state-output-port.interface.js";

const SESSION_PLATFORMS_LIST = [
  SESSION_PLATFORMS.YOUTUBE,
  SESSION_PLATFORMS.TWITCH,
] as const;

@injectable()
export class WebSocketCommentOutputPort
  implements CommentOutputPort, SessionStateOutputPort
{
  private server: WebSocketServer | null = null;

  private readonly sessionSnapshots: StreamingSessionSnapshots = {
    [SESSION_PLATFORMS.YOUTUBE]: {
      platform: SESSION_PLATFORMS.YOUTUBE,
      state: SESSION_STATES.IDLE,
    },
    [SESSION_PLATFORMS.TWITCH]: {
      platform: SESSION_PLATFORMS.TWITCH,
      state: SESSION_STATES.IDLE,
    },
  };

  async start(
    endpoint: WebSocketApiEndpoint = getWebSocketApiEndpoint(),
  ): Promise<void> {
    if (this.server) {
      return;
    }

    const server = new WebSocketServer({
      host: endpoint.host,
      port: endpoint.port,
    });

    server.on("connection", (client) => {
      this.sendSessionSnapshots(client);
    });

    await new Promise<void>((resolve, reject) => {
      const handleListening = (): void => {
        server.off("error", handleError);
        resolve();
      };
      const handleError = (error: Error): void => {
        server.off("listening", handleListening);
        reject(error);
      };

      server.once("listening", handleListening);
      server.once("error", handleError);
    });

    this.server = server;
    console.info("[api-gateway] WebSocket server started", endpoint);
  }

  async outputToUi(comments: CommentViewDto[]): Promise<void> {
    await this.ensureServerStarted();

    for (const comment of comments) {
      const message: CommentsAppendMessage = {
        type: COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_APPEND,
        payload: { comment },
      };
      this.broadcast(message);
    }
  }

  async publishSessionState(event: SessionStateOutputEvent): Promise<void> {
    this.sessionSnapshots[event.platform] = {
      platform: event.platform,
      state: event.state,
      ...(event.reason ? { reason: event.reason } : {}),
    };

    await this.ensureServerStarted();
    this.broadcast(this.toSessionStateMessage(event));
  }

  async close(): Promise<void> {
    if (!this.server) {
      return;
    }

    const server = this.server;
    this.server = null;

    for (const client of server.clients) {
      client.terminate();
    }

    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private async ensureServerStarted(): Promise<void> {
    if (this.server) {
      return;
    }
    await this.start();
  }

  private sendSessionSnapshots(client: WebSocket): void {
    for (const platform of SESSION_PLATFORMS_LIST) {
      const snapshot = this.sessionSnapshots[platform];
      this.send(client, this.toSessionStateMessage(snapshot));
    }
  }

  private broadcast(message: CommentDeliveryMessage): void {
    if (!this.server) {
      return;
    }

    const encoded = JSON.stringify(message);
    for (const client of this.server.clients) {
      this.sendEncoded(client, encoded);
    }
  }

  private send(client: WebSocket, message: CommentDeliveryMessage): void {
    this.sendEncoded(client, JSON.stringify(message));
  }

  private sendEncoded(client: WebSocket, encoded: string): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(encoded);
    }
  }

  private toSessionStateMessage(
    event: SessionStateOutputEvent,
  ): SessionStateMessage {
    return {
      type: COMMENT_DELIVERY_MESSAGE_TYPES.SESSION_STATE,
      payload: {
        platform: event.platform,
        state: event.state,
        ...(event.reason ? { reason: event.reason } : {}),
      },
    };
  }
}
