import "reflect-metadata";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { container } from "tsyringe";
import { createAuthClient, type AuthClient } from "@comment-dock/auth";
import { YouTubeAccessTokenProvider } from "./adapters/youtube/access-token/access-token-provider.js";
import { YOUTUBE_DI_TOKENS } from "./adapters/youtube/access-token/di-tokens.js";
import { TwitchAccessTokenProvider } from "./adapters/twitch/access-token/access-token-provider.js";
import { TWITCH_DI_TOKENS } from "./adapters/twitch/access-token/di-tokens.js";
import { TwitchHelixClient } from "./adapters/twitch/client/helix.client.js";
import { TwitchEventSubWebSocketClient } from "./adapters/twitch/client/eventsub-websocket.client.js";
import { TwitchLiveStreamClient } from "./adapters/twitch/client/live-stream.client.js";
import { TwitchLiveStreamRepository } from "./adapters/twitch/repository/live-stream.repository.js";
import { TwitchCommentRepository } from "./adapters/twitch/repository/comment.repository.js";
import { YouTubeApiClient } from "./adapters/youtube/client/api.client.js";
import { YouTubeLiveStreamClient } from "./adapters/youtube/client/live-stream.client.js";
import { YouTubeLiveStreamRepository } from "./adapters/youtube/repository/live-stream.repository.js";
import { runCommentFetcherApp } from "./app/main.js";
import { SHARED_DI_TOKENS } from "./infrastructure/shared/http/http-client.js";
import { SHARED_AUTH_DI_TOKENS } from "./infrastructure/shared/auth/di-tokens.js";
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
container.register<AuthClient>(SHARED_AUTH_DI_TOKENS.authClient, {
  useValue: createAuthClient(),
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
container.register(TWITCH_DI_TOKENS.helixClient, {
  useClass: TwitchHelixClient,
});
container.register(TWITCH_DI_TOKENS.eventSubClient, {
  useClass: TwitchEventSubWebSocketClient,
});
container.register(TWITCH_DI_TOKENS.liveStreamClient, {
  useClass: TwitchLiveStreamClient,
});
container.register(TWITCH_DI_TOKENS.liveStreamRepository, {
  useClass: TwitchLiveStreamRepository,
});
container.register(TWITCH_DI_TOKENS.commentRepository, {
  useClass: TwitchCommentRepository,
});

runCommentFetcherApp().catch((error: unknown) => {
  console.error("[comment-fetcher] fatal error", error);
  process.exitCode = 1;
});
