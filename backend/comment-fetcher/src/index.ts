import "reflect-metadata";
import { container } from "tsyringe";
import { YouTubeAccessTokenProvider } from "./adapters/youtube/access-token/access-token-provider.js";
import { YOUTUBE_DI_TOKENS } from "./adapters/youtube/access-token/di-tokens.js";
import { YouTubeApiClient } from "./adapters/youtube/client/api.client.js";
import { SHARED_DI_TOKENS } from "./infrastructure/http/http-client.js";

container.register(SHARED_DI_TOKENS.httpClient, {
  useValue: fetch,
});
container.register(YOUTUBE_DI_TOKENS.accessTokenProvider, {
  useClass: YouTubeAccessTokenProvider,
});
container.register(YOUTUBE_DI_TOKENS.apiClient, {
  useClass: YouTubeApiClient,
});

console.info(
  "[comment-fetcher] service scaffold — replace with real entrypoint",
);
