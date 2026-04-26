import { inject, injectable } from "tsyringe";
import WebSocket from "ws";
import { TWITCH_DI_TOKENS } from "../access-token/di-tokens.js";
import type { TwitchHelixClient } from "./helix.client.js";
import type { TwitchConfigProvider } from "../../../infrastructure/twitch/config/api-config.js";
import {
  TWITCH_EVENTSUB_MESSAGE_TYPES,
  type TwitchEventSubEnvelopeDto,
  type TwitchEventSubSessionWelcomeEnvelopeDto,
} from "../dto/raw.dto.js";

// ws 実装を直接固定せず、テスト時に差し替え可能にするための runtime 境界。
type WebSocketRuntime = {
  createClient: (url: string) => WebSocket;
};

const DEFAULT_WEBSOCKET_RUNTIME: WebSocketRuntime = {
  createClient: (url) => new WebSocket(url),
};

export type ConnectedEventSubSession = {
  socket: WebSocket;
  sessionId: string;
};

@injectable()
export class TwitchEventSubWebSocketClient {
  constructor(
    @inject(TWITCH_DI_TOKENS.helixClient)
    private readonly helixClient: TwitchHelixClient,
    @inject(TWITCH_DI_TOKENS.configProvider)
    private readonly configProvider: TwitchConfigProvider,
    private readonly runtime: WebSocketRuntime = DEFAULT_WEBSOCKET_RUNTIME,
  ) {}

  /**
   * EventSub WebSocketへ接続し、session_welcome から session_id を取得して返す。
   * 返り値:
   * - socket: 以降の message/error/close 監視と受信継続に使う接続本体
   * - sessionId: Helix の eventsub/subscriptions 作成時の transport.session_id に使う
   * NOTE: subscribe と AsyncIterable 化はこの後のステップで実装する。
   */
  async connect(): Promise<ConnectedEventSubSession> {
    const url = this.configProvider.getEventSubWebSocketUrl();
    const socket = this.runtime.createClient(url);

    await new Promise<void>((resolve, reject) => {
      const handleOpen = () => {
        cleanup();
        resolve();
      };
      const handleError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        socket.off("open", handleOpen);
        socket.off("error", handleError);
      };
      socket.once("open", handleOpen);
      socket.once("error", handleError);
    });

    const sessionId = await this.waitForSessionWelcome(socket);
    return { socket, sessionId };
  }

  /**
   * EventSub の生メッセージ文字列を envelope DTO へ変換する。
   * - JSONとして不正な場合はエラー
   * - EventSub envelope 形式（metadata.message_type が既知値）でない場合はエラー
   */
  parseEnvelope(payload: string): TwitchEventSubEnvelopeDto {
    const parsed = this.parseJson(payload);

    if (!this.isEventSubEnvelope(parsed)) {
      throw new Error("Invalid Twitch EventSub envelope format.");
    }

    return parsed;
  }

  /**
   * EventSub WebSocket セッションへ、チャット受信用の2購読を作成する。
   * - channel.chat.message
   * - channel.chat.notification
   */
  async subscribeChatEvents(input: {
    sessionId: string;
    broadcasterUserId: string;
    userId: string;
  }): Promise<void> {
    await Promise.all([
      this.helixClient.createEventSubSubscription({
        type: "channel.chat.message",
        version: "1",
        condition: {
          broadcaster_user_id: input.broadcasterUserId,
          user_id: input.userId,
        },
        sessionId: input.sessionId,
      }),
      this.helixClient.createEventSubSubscription({
        type: "channel.chat.notification",
        version: "1",
        condition: {
          broadcaster_user_id: input.broadcasterUserId,
          user_id: input.userId,
        },
        sessionId: input.sessionId,
      }),
    ]);
  }

  private async waitForSessionWelcome(socket: WebSocket): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const handleMessage = (raw: WebSocket.RawData) => {
        const payload =
          typeof raw === "string"
            ? raw
            : Buffer.isBuffer(raw)
              ? raw.toString("utf8")
              : raw.toString();
        const envelope = this.parseEnvelope(payload);

        if (
          envelope.metadata.message_type !==
          TWITCH_EVENTSUB_MESSAGE_TYPES.SESSION_WELCOME
        ) {
          return;
        }

        cleanup();
        resolve(
          (envelope as TwitchEventSubSessionWelcomeEnvelopeDto).payload.session
            .id,
        );
      };

      const handleError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const handleClose = () => {
        cleanup();
        reject(
          new Error("Twitch EventSub socket closed before session_welcome."),
        );
      };

      const cleanup = () => {
        socket.off("message", handleMessage);
        socket.off("error", handleError);
        socket.off("close", handleClose);
      };

      socket.on("message", handleMessage);
      socket.once("error", handleError);
      socket.once("close", handleClose);
    });
  }

  private isEventSubEnvelope(
    value: unknown,
  ): value is TwitchEventSubEnvelopeDto {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    const metadata = (value as { metadata?: unknown }).metadata;
    if (typeof metadata !== "object" || metadata === null) {
      return false;
    }

    const messageType = (metadata as { message_type?: unknown }).message_type;
    return (
      messageType === TWITCH_EVENTSUB_MESSAGE_TYPES.SESSION_WELCOME ||
      messageType === TWITCH_EVENTSUB_MESSAGE_TYPES.NOTIFICATION ||
      messageType === TWITCH_EVENTSUB_MESSAGE_TYPES.SESSION_RECONNECT ||
      messageType === TWITCH_EVENTSUB_MESSAGE_TYPES.REVOCATION
    );
  }

  private parseJson(payload: string): unknown {
    try {
      return JSON.parse(payload);
    } catch {
      throw new Error("Failed to parse Twitch EventSub message as JSON.");
    }
  }
}
