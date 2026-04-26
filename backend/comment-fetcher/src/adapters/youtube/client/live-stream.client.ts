import { inject, injectable } from "tsyringe";
import { YOUTUBE_DI_TOKENS } from "../access-token/di-tokens.js";
import type { AccessTokenProvider } from "../../../infrastructure/shared/auth/access-token-provider.js";
import { SHARED_DI_TOKENS } from "../../../infrastructure/shared/http/http-client.js";
import type { HttpClient } from "../../../infrastructure/shared/http/http-client.js";
import type { YouTubeConfigProvider } from "../../../infrastructure/youtube/config/api-config.js";
import type {
  YouTubeSearchListResponseDto,
  YouTubeVideosListResponseDto,
} from "../dto/live-stream.dto.js";

@injectable()
export class YouTubeLiveStreamClient {
  constructor(
    @inject(YOUTUBE_DI_TOKENS.accessTokenProvider)
    private readonly accessTokenProvider: AccessTokenProvider,
    @inject(SHARED_DI_TOKENS.httpClient)
    private readonly httpClient: HttpClient,
    @inject(YOUTUBE_DI_TOKENS.configProvider)
    private readonly configProvider: YouTubeConfigProvider,
  ) {}

  async findLiveStream(input: {
    channelId: string;
  }): Promise<{ liveStreamId: string; liveChatId: string } | null> {
    const liveStreamId = await this.findLiveStreamId(input.channelId);
    if (!liveStreamId) {
      return null;
    }

    const liveChatId = await this.findLiveChatId(liveStreamId);
    if (!liveChatId) {
      return null;
    }

    return {
      liveStreamId,
      liveChatId,
    };
  }

  /** 指定チャンネルで現在配信中のライブ配信IDを1件取得する。 */
  private async findLiveStreamId(channelId: string): Promise<string | null> {
    const query = new URLSearchParams({
      part: "id",
      channelId,
      eventType: "live",
      type: "video",
      maxResults: "1",
    });
    const url = `${this.configProvider.getDataApiBaseUrl()}/search?${query.toString()}`;
    const response = await this.request<YouTubeSearchListResponseDto>(url);
    return response.items[0]?.id?.videoId ?? null;
  }

  /** 指定したライブ配信IDに紐づくアクティブなライブチャットIDを1件取得する。 */
  private async findLiveChatId(liveStreamId: string): Promise<string | null> {
    const query = new URLSearchParams({
      part: "liveStreamingDetails",
      id: liveStreamId,
    });
    const url = `${this.configProvider.getDataApiBaseUrl()}/videos?${query.toString()}`;
    const response = await this.request<YouTubeVideosListResponseDto>(url);
    return response.items[0]?.liveStreamingDetails?.activeLiveChatId ?? null;
  }

  private async request<T>(url: string): Promise<T> {
    const accessToken = await this.accessTokenProvider.getAccessToken();
    if (!accessToken) {
      throw new Error(
        "YouTube access token is missing from AccessTokenProvider.",
      );
    }

    const response = await this.httpClient(url, {
      method: "GET",
      headers: {
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

    return (await response.json()) as T;
  }
}
