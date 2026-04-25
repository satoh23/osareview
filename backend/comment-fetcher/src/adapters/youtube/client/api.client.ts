import type { YouTubeLiveChatMessagesListResponseDto } from "../dto/raw.dto.js";
import { inject, injectable } from "tsyringe";
import { YOUTUBE_DI_TOKENS } from "../access-token/di-tokens.js";
import type { AccessTokenProvider } from "../../../infrastructure/auth/access-token-provider.js";
import type { YouTubeConfigProvider } from "../../../infrastructure/config/youtube-api-base-url.js";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { fileURLToPath } from "node:url";

type FetchYouTubeLiveChatMessagesInput = {
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

    const packageDefinition = protoLoader.loadSync(
      fileURLToPath(new URL("./stream_list.proto", import.meta.url)),
      {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    );
    // protoファイルからgRPCクライアントの型情報作成
    const loaded = grpc.loadPackageDefinition(packageDefinition) as {
      youtube: {
        api: {
          v3: {
            V3DataLiveChatMessageService: grpc.ServiceClientConstructor;
          };
        };
      };
    };

    const apiBaseUrl = new URL(this.configProvider.getDataApiBaseUrl());
    const target = `${apiBaseUrl.hostname}:${apiBaseUrl.port || "443"}`;

    // gRPCクライアント生成
    const client = new loaded.youtube.api.v3.V3DataLiveChatMessageService(
      target,
      grpc.credentials.createSsl(),
    ) as grpc.Client;

    const metadata = new grpc.Metadata();
    metadata.set("authorization", `Bearer ${accessToken}`);
    metadata.set("x-goog-api-format-version", "2");

    const request = {
      live_chat_id: input.liveChatId,
      page_token: input.pageToken,
      part: ["id", "snippet", "authorDetails"],
      max_results: 2000,
    };

    const streamClient = client as grpc.Client & {
      StreamList: (
        req: Record<string, unknown>,
        md: grpc.Metadata,
      ) => grpc.ClientReadableStream<YouTubeLiveChatMessagesListResponseDto>;
    };

    // TODO: usecases/repository の契約を stream 前提（AsyncIterable等）へ移行したら、
    // TODO: ここは「最初の1件だけ返す」暫定実装を廃止し、継続受信をそのまま上位へ流す。
    // TODO: 現在は既存インターフェース（Promiseで1件返却）維持のために stream を即 cancel している。
    return await new Promise<YouTubeLiveChatMessagesListResponseDto>(
      (resolve, reject) => {
        const stream = streamClient.StreamList(request, metadata);

        let resolved = false;

        stream.on("data", (chunk: YouTubeLiveChatMessagesListResponseDto) => {
          if (resolved) {
            return;
          }
          resolved = true;
          stream.cancel();
          resolve(chunk);
        });
        stream.on("error", (error: Error) => {
          if (resolved) {
            return;
          }
          reject(error);
        });
        stream.on("end", () => {
          if (resolved) {
            return;
          }
          reject(new Error("YouTube streamList ended without any messages."));
        });
      },
    );
  }
}
