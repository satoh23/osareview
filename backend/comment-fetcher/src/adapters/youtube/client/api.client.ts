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

// gRPC本体を直接importしたままだとテストで差し替えづらいため、
// streamList呼び出しに必要な依存（proto読み込み/クライアント生成/metadata）を
// ひとかたまりのruntimeとして注入可能にしている。
type StreamListRuntime = {
  loadSync: typeof protoLoader.loadSync;
  loadPackageDefinition: typeof grpc.loadPackageDefinition;
  createSsl: typeof grpc.credentials.createSsl;
  Metadata: typeof grpc.Metadata;
};

// 本番実行時に使うデフォルトruntime。
// テスト時はコンストラクタ第3引数でモックruntimeを渡して差し替える。
const DEFAULT_STREAM_LIST_RUNTIME: StreamListRuntime = {
  loadSync: protoLoader.loadSync,
  loadPackageDefinition: grpc.loadPackageDefinition,
  createSsl: grpc.credentials.createSsl,
  Metadata: grpc.Metadata,
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
    private readonly streamListRuntime: StreamListRuntime = DEFAULT_STREAM_LIST_RUNTIME,
  ) {}

  async *fetchLiveChatMessages(
    input: FetchYouTubeLiveChatMessagesInput,
  ): AsyncIterable<YouTubeLiveChatMessagesListResponseDto> {
    const accessToken = await this.accessTokenProvider.getAccessToken();
    if (!accessToken) {
      throw new Error(
        "YouTube access token is missing from AccessTokenProvider.",
      );
    }

    const packageDefinition = this.streamListRuntime.loadSync(
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
    const loaded = this.streamListRuntime.loadPackageDefinition(
      packageDefinition,
    ) as {
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
      this.streamListRuntime.createSsl(),
    ) as grpc.Client;

    const metadata = new this.streamListRuntime.Metadata();
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

    // streamList はイベント駆動（data/end/error）なので、
    // 状態変数で AsyncIterable へ橋渡しする
    const stream = streamClient.StreamList(request, metadata);
    // 受信チャンクを一時的に貯めるキュー
    const queue: YouTubeLiveChatMessagesListResponseDto[] = [];
    // end 到達フラグ。true になったら新規受信は終了
    let done = false;
    // エラーを保持し、for-await 側で throw して上位へ伝播する
    let streamError: Error | null = null;
    // for-await 側が「次のデータ待ち」中に保持する resume 関数
    let wakeup: (() => void) | null = null;

    // data/end/error 受信時に待機中の for-await を起こす。
    const notify = () => {
      if (wakeup) {
        const fn = wakeup;
        wakeup = null;
        fn();
      }
    };

    stream.on("data", (chunk: YouTubeLiveChatMessagesListResponseDto) => {
      queue.push(chunk);
      notify();
    });
    stream.on("error", (error: Error) => {
      streamError = error;
      done = true;
      notify();
    });
    stream.on("end", () => {
      done = true;
      notify();
    });

    try {
      while (true) {
        if (queue.length > 0) {
          const chunk = queue.shift();
          if (chunk) {
            yield chunk;
          }
          continue;
        }

        if (streamError) {
          throw streamError;
        }

        if (done) {
          break;
        }

        await new Promise<void>((resolve) => {
          wakeup = resolve;
        });
      }
    } finally {
      stream.cancel();
    }
  }
}
