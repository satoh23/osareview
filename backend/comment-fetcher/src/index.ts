import "reflect-metadata";
import { container } from "tsyringe";
import { YouTubeAccessTokenProvider } from "./adapters/youtube/access-token/access-token-provider.js";
import { YOUTUBE_DI_TOKENS } from "./adapters/youtube/access-token/di-tokens.js";
import { YouTubeApiClient } from "./adapters/youtube/client/api.client.js";
import { YouTubeLiveStreamClient } from "./adapters/youtube/client/live-stream.client.js";
import { YouTubeLiveStreamRepository } from "./adapters/youtube/repository/live-stream.repository.js";
import { runCommentFetcherApp } from "./app/main.js";
import { SHARED_DI_TOKENS } from "./infrastructure/http/http-client.js";
import { EnvYouTubeConfigProvider } from "./infrastructure/config/youtube-api-base-url.js";

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

runCommentFetcherApp().catch((error: unknown) => {
  console.error("[comment-fetcher] fatal error", error);
  process.exitCode = 1;
});
