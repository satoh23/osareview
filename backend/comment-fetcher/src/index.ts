import "reflect-metadata";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { container } from "tsyringe";
import { YouTubeAccessTokenProvider } from "./adapters/youtube/access-token/access-token-provider.js";
import { YOUTUBE_DI_TOKENS } from "./adapters/youtube/access-token/di-tokens.js";
import { TwitchAccessTokenProvider } from "./adapters/twitch/access-token/access-token-provider.js";
import { TWITCH_DI_TOKENS } from "./adapters/twitch/access-token/di-tokens.js";
import { YouTubeApiClient } from "./adapters/youtube/client/api.client.js";
import { YouTubeLiveStreamClient } from "./adapters/youtube/client/live-stream.client.js";
import { YouTubeLiveStreamRepository } from "./adapters/youtube/repository/live-stream.repository.js";
import { runCommentFetcherApp } from "./app/main.js";
import { SHARED_DI_TOKENS } from "./infrastructure/shared/http/http-client.js";
import { EnvTwitchConfigProvider } from "./infrastructure/twitch/config/api-config.js";
import { EnvYouTubeConfigProvider } from "./infrastructure/youtube/config/api-config.js";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);
dotenv.config({
  path: resolve(currentDir, "../../../.env"),
});

container.register(SHARED_DI_TOKENS.httpClient, {
  useValue: fetch,
});
container.register(YOUTUBE_DI_TOKENS.accessTokenProvider, {
  useClass: YouTubeAccessTokenProvider,
});
container.register(YOUTUBE_DI_TOKENS.apiClient, {
  useClass: YouTubeApiClient,
});
container.register(YOUTUBE_DI_TOKENS.liveStreamClient, {
  useClass: YouTubeLiveStreamClient,
});
container.register(YOUTUBE_DI_TOKENS.liveStreamRepository, {
  useClass: YouTubeLiveStreamRepository,
});
container.register(YOUTUBE_DI_TOKENS.configProvider, {
  useClass: EnvYouTubeConfigProvider,
});
container.register(TWITCH_DI_TOKENS.accessTokenProvider, {
  useClass: TwitchAccessTokenProvider,
});
container.register(TWITCH_DI_TOKENS.configProvider, {
  useClass: EnvTwitchConfigProvider,
});

runCommentFetcherApp().catch((error: unknown) => {
  console.error("[comment-fetcher] fatal error", error);
  process.exitCode = 1;
});
