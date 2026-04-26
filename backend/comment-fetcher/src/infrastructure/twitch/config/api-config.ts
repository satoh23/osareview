import { injectable } from "tsyringe";

// Twitch Helix REST API の既定ベースURL。
const DEFAULT_TWITCH_HELIX_API_BASE_URL = "https://api.twitch.tv/helix";
// Twitch EventSub WebSocket の既定接続先URL。
const DEFAULT_TWITCH_EVENTSUB_WEBSOCKET_URL = "wss://eventsub.wss.twitch.tv/ws";

export interface TwitchConfigProvider {
  // Helix API 呼び出し時に使うベースURLを返す。
  getHelixApiBaseUrl(): string;
  // EventSub WebSocket 接続時に使うURLを返す。
  getEventSubWebSocketUrl(): string;
  // Helix リクエストヘッダで使う Client-Id を返す。
  getClientId(): string;
}

@injectable()
export class EnvTwitchConfigProvider implements TwitchConfigProvider {
  getHelixApiBaseUrl(): string {
    return (
      process.env.TWITCH_HELIX_API_BASE_URL ?? DEFAULT_TWITCH_HELIX_API_BASE_URL
    );
  }

  getEventSubWebSocketUrl(): string {
    return (
      process.env.TWITCH_EVENTSUB_WS_URL ??
      DEFAULT_TWITCH_EVENTSUB_WEBSOCKET_URL
    );
  }

  getClientId(): string {
    return process.env.TWITCH_CLIENT_ID ?? "";
  }
}
