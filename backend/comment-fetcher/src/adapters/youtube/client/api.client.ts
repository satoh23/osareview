import type { YouTubeLiveChatMessagesListResponseDto } from "../dto/raw.dto.js";
import { inject, injectable } from "tsyringe";
import { YOUTUBE_DI_TOKENS } from "../access-token/di-tokens.js";
import type { AccessTokenProvider } from "../../../infrastructure/auth/access-token-provider.js";
import { SHARED_DI_TOKENS } from "../../../infrastructure/http/http-client.js";
import type { HttpClient } from "../../../infrastructure/http/http-client.js";
import type { YouTubeConfigProvider } from "../../../infrastructure/config/youtube-api-base-url.js";

export type FetchYouTubeLiveChatMessagesInput = {
  liveChatId: string;
  pageToken?: string;
};

/**
 * YouTube Data API v3 クライアント（liveChatMessages.list 専用）。
 *
 * 参照:
 * - https://developers.google.com/youtube/v3/live/docs/liveChatMessages/list
 *
 * 認証に関する注意:
 * - 現在は backend の最低動作確認を優先し、環境変数読むAccessTokenProviderを注入する暫定実装。
 * - 正式版では OAuth2 + PKCE で取得したトークンをセキュアストレージ管理し、
 *   ここへ注入する方式に置き換える。
 */
@injectable()
export class YouTubeApiClient {
  constructor(
    @inject(YOUTUBE_DI_TOKENS.accessTokenProvider)
    private readonly accessTokenProvider: AccessTokenProvider,
    @inject(SHARED_DI_TOKENS.httpClient)
    private readonly httpClient: HttpClient,
    @inject(YOUTUBE_DI_TOKENS.configProvider)
    private readonly configProvider: YouTubeConfigProvider,
  ) {}

  async fetchLiveChatMessages(
    input: FetchYouTubeLiveChatMessagesInput,
  ): Promise<YouTubeLiveChatMessagesListResponseDto> {
    const accessToken = await this.accessTokenProvider.getAccessToken();
    if (!accessToken) {
      throw new Error(
        "YouTube access token is missing from AccessTokenProvider.",
      );
    }

    const query = new URLSearchParams({
      part: "id,snippet,authorDetails",
      liveChatId: input.liveChatId,
      maxResults: "2000",
    });

    if (input.pageToken) {
      query.set("pageToken", input.pageToken);
    }

    const url = `${this.configProvider.getDataApiBaseUrl()}/liveChatMessages?${query.toString()}`;

    const response = await this.httpClient(url, {
      method: "GET",
      headers: {
        // TODO: 正式版では AccessTokenProvider から取得した有効トークンを使用し、
        // TODO: 必要に応じて期限切れ時の再取得（refresh）フローへ接続する。
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `YouTube API request failed: ${response.status} ${response.statusText} ${errorBody}`,
      );
    }

    return (await response.json()) as YouTubeLiveChatMessagesListResponseDto;
  }
}
