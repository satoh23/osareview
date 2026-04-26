import { inject, injectable } from "tsyringe";
import { TWITCH_DI_TOKENS } from "../access-token/di-tokens.js";
import type { AccessTokenProvider } from "../../../infrastructure/shared/auth/access-token-provider.js";
import { SHARED_DI_TOKENS } from "../../../infrastructure/shared/http/http-client.js";
import type { HttpClient } from "../../../infrastructure/shared/http/http-client.js";
import type { TwitchConfigProvider } from "../../../infrastructure/twitch/config/api-config.js";
import type {
  TwitchStreamsResponseDto,
  TwitchUsersResponseDto,
} from "../dto/raw.dto.js";

@injectable()
export class TwitchHelixClient {
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
    const response = await this.request<TwitchUsersResponseDto>(url);
    // ユーザーが見つかればそのID、見つからなければ null
    return response.data[0]?.id ?? null;
  }

  /** user_id から現在配信中の stream id を1件取得する。 */
  async findActiveStream(userId: string): Promise<{ streamId: string } | null> {
    const query = new URLSearchParams({ user_id: userId });
    const url = `${this.configProvider.getHelixApiBaseUrl()}/streams?${query.toString()}`;
    const response = await this.request<TwitchStreamsResponseDto>(url);
    const streamId = response.data[0]?.id;
    if (!streamId) return null;

    return { streamId };
  }

  private async request<T>(url: string): Promise<T> {
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
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Client-Id": clientId,
        Accept: "application/json",
      },
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
