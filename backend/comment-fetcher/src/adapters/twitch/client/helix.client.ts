import { inject, injectable } from "tsyringe";
import { TWITCH_DI_TOKENS } from "../access-token/di-tokens.js";
import type { AccessTokenProvider } from "../../../infrastructure/shared/auth/access-token-provider.js";
import { SHARED_DI_TOKENS } from "../../../infrastructure/shared/http/http-client.js";
import type { HttpClient } from "../../../infrastructure/shared/http/http-client.js";
import type { TwitchConfigProvider } from "../../../infrastructure/twitch/config/api-config.js";
import type {
  TwitchEventSubSubscriptionsResponseDto,
  TwitchEventSubSubscriptionType,
  TwitchStreamsResponseDto,
  TwitchUsersResponseDto,
} from "../dto/raw.dto.js";

@injectable()
export class TwitchHelixClient {
  // getSelfUserId() の結果をメモ化し、同一プロセス内の重複API呼び出しを避ける。
  private selfUserId: string | null = null;

  constructor(
    @inject(TWITCH_DI_TOKENS.accessTokenProvider)
    private readonly accessTokenProvider: AccessTokenProvider,
    @inject(SHARED_DI_TOKENS.httpClient)
    private readonly httpClient: HttpClient,
    @inject(TWITCH_DI_TOKENS.configProvider)
    private readonly configProvider: TwitchConfigProvider,
  ) {}

  /** user_login から broadcaster_user_id を1件解決する。 */
  async resolveUserIdByLogin(userLogin: string): Promise<string | null> {
    const query = new URLSearchParams({ login: userLogin });
    const url = `${this.configProvider.getHelixApiBaseUrl()}/users?${query.toString()}`;
    const response = await this.request<TwitchUsersResponseDto>(url, "GET");
    // ユーザーが見つかればそのID、見つからなければ null
    return response.data[0]?.id ?? null;
  }

  /** user_id から現在配信中の stream id を1件取得する。 */
  async findActiveStream(userId: string): Promise<{ streamId: string } | null> {
    const query = new URLSearchParams({ user_id: userId });
    const url = `${this.configProvider.getHelixApiBaseUrl()}/streams?${query.toString()}`;
    const response = await this.request<TwitchStreamsResponseDto>(url, "GET");
    const streamId = response.data[0]?.id;
    if (!streamId) return null;

    return { streamId };
  }

  /** 現在のアクセストークンに紐づく user_id を取得する。 */
  async getSelfUserId(): Promise<string> {
    if (this.selfUserId) {
      return this.selfUserId;
    }

    const url = `${this.configProvider.getHelixApiBaseUrl()}/users`;
    const response = await this.request<TwitchUsersResponseDto>(url, "GET");
    const userId = response.data[0]?.id;
    if (!userId) {
      throw new Error("Twitch self user was not found from /helix/users.");
    }
    this.selfUserId = userId;
    return userId;
  }

  /** EventSub WebSocket セッションへチャット購読を1件作成する。 */
  async createEventSubSubscription(input: {
    type: TwitchEventSubSubscriptionType;
    version: "1";
    condition: {
      broadcaster_user_id: string;
      user_id: string;
    };
    sessionId: string;
  }): Promise<void> {
    const url = `${this.configProvider.getHelixApiBaseUrl()}/eventsub/subscriptions`;
    await this.request<TwitchEventSubSubscriptionsResponseDto>(
      url,
      "POST",
      JSON.stringify({
        type: input.type,
        version: input.version,
        condition: input.condition,
        transport: {
          method: "websocket",
          session_id: input.sessionId,
        },
      }),
    );
  }

  private async request<T>(
    url: string,
    method: "GET" | "POST",
    body?: string,
  ): Promise<T> {
    const accessToken = await this.accessTokenProvider.getAccessToken();
    if (!accessToken) {
      throw new Error(
        "Twitch access token is missing from AccessTokenProvider.",
      );
    }

    const clientId = this.configProvider.getClientId();
    if (!clientId) {
      throw new Error("Twitch client ID is missing from TwitchConfigProvider.");
    }

    const response = await this.httpClient(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": clientId,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body } : {}),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Twitch Helix request failed: ${response.status} ${response.statusText} ${errorBody}`,
      );
    }

    return (await response.json()) as T;
  }
}
