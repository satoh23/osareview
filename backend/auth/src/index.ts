import "reflect-metadata";
import type { Provider } from "./provider.js";
import { container } from "tsyringe";
import { KeyringTokenStoreRepository } from "./adapters/keyring/repository/token-store.repository.js";
import { YouTubeOAuthClient } from "./adapters/youtube/client/oauth.client.js";
import { EnvYouTubeOAuthConfigProvider } from "./infrastructure/youtube/config/oauth-config.js";
import { TwitchDeviceCodeOAuthClient } from "./adapters/twitch/client/device-code-oauth.client.js";
import { EnvTwitchOAuthConfigProvider } from "./infrastructure/twitch/config/oauth-config.js";
import { OpenBrowserLauncher } from "./adapters/shared/browser/browser.launcher.js";
import { LoopbackOAuthCallbackReceiver } from "./adapters/shared/loopback/loopback.callback-receiver.js";
import { RandomPkceGenerator } from "./adapters/shared/pkce/pkce.js";
import { RandomStateGenerator } from "./adapters/shared/state/random-state.generator.js";
import { YouTubeLoginPolicy } from "./adapters/youtube/config/login-policy.js";
import { TwitchLoginPolicy } from "./adapters/twitch/config/login-policy.js";
import { AuthorizationCodeLoopbackLoginStrategy } from "./adapters/youtube/login/authorization-code-loopback-login-strategy.js";
import { DeviceCodeLoginStrategy } from "./adapters/twitch/login/device-code-login-strategy.js";
import { LoginUsecase } from "./usecases/login.usecase.js";
import {
  GetValidAccessTokenUsecase,
  NotAuthorizedError,
} from "./usecases/get-valid-access-token.usecase.js";
import {
  GetLinkStatusUsecase,
  type LinkStatus,
} from "./usecases/get-link-status.usecase.js";
import { RefreshAccessTokenUsecase } from "./usecases/refresh-access-token.usecase.js";
import {
  WithAuthorizedRequestUsecase,
  type AuthorizedRequestFn,
} from "./usecases/with-authorized-request.usecase.js";
import {
  CreateAuthorizedTokenAccessorUsecase,
  type AuthorizedTokenAccessor,
} from "./usecases/create-authorized-token-accessor.usecase.js";
import {
  AuthorizationLostNotifier,
  type AuthorizationLostEvent,
  type AuthorizationLostListener,
} from "./shared/authorization-lost-notifier.js";
import { AUTH_DI_TOKENS } from "./shared/di-tokens.js";
import { DEFAULT_ACCESS_TOKEN_CLOCK_SKEW_MS } from "./entities/token/token-set.js";
import type {
  LoginStrategy,
  OAuthTokenRefresher,
  TokenStore,
} from "./usecases/interfaces/index.js";
import { UnauthorizedRequestError } from "./errors/unauthorized-request.error.js";

export type { Provider };
export type {
  AuthorizationLostEvent,
  AuthorizationLostListener,
  AuthorizedTokenAccessor,
  LinkStatus,
};
export { NotAuthorizedError, UnauthorizedRequestError };

export interface AuthClient {
  login(provider: Provider): Promise<void>;
  getLinkStatus(provider: Provider): Promise<LinkStatus>;
  getValidAccessToken(provider: Provider): Promise<string>;
  withAuthorizedRequest<T>(
    provider: Provider,
    requestFn: AuthorizedRequestFn<T>,
  ): Promise<T>;
  createAuthorizedTokenAccessor(provider: Provider): AuthorizedTokenAccessor;
  onAuthorizationLost(listener: AuthorizationLostListener): () => void;
  refresh(provider: Provider): Promise<string>;
  logout(provider: Provider): Promise<void>;
}

export type CreateAuthClientOptions = {
  accessTokenClockSkewMs?: number;
};

function assertSupportedProvider(provider: Provider): void {
  if (provider !== "youtube" && provider !== "twitch") {
    throw new Error(`対応していない連携先です: ${provider}`);
  }
}

export function createAuthClient(
  options: CreateAuthClientOptions = {},
): AuthClient {
  const c = container.createChildContainer();

  const browserLauncher = new OpenBrowserLauncher();
  const callbackReceiver = new LoopbackOAuthCallbackReceiver();
  const pkceGenerator = new RandomPkceGenerator();
  const stateGenerator = new RandomStateGenerator();

  const youtubeConfigProvider = new EnvYouTubeOAuthConfigProvider();
  const twitchConfigProvider = new EnvTwitchOAuthConfigProvider();

  const youtubeOAuthClient = new YouTubeOAuthClient(youtubeConfigProvider);
  const twitchDeviceCodeOAuthClient = new TwitchDeviceCodeOAuthClient(
    twitchConfigProvider,
  );

  const youtubeLoginPolicy = new YouTubeLoginPolicy(youtubeConfigProvider);
  const twitchLoginPolicy = new TwitchLoginPolicy(twitchConfigProvider);
  const authorizationLostNotifier = new AuthorizationLostNotifier();

  const youtubeLoginStrategy = new AuthorizationCodeLoopbackLoginStrategy(
    youtubeOAuthClient,
    browserLauncher,
    callbackReceiver,
    pkceGenerator,
    stateGenerator,
    youtubeLoginPolicy,
  );
  const twitchLoginStrategy = new DeviceCodeLoginStrategy(
    twitchDeviceCodeOAuthClient,
    browserLauncher,
    twitchLoginPolicy,
  );

  const loginStrategyByProvider = new Map<Provider, LoginStrategy>();
  loginStrategyByProvider.set("youtube", youtubeLoginStrategy);
  loginStrategyByProvider.set("twitch", twitchLoginStrategy);

  const oauthTokenRefresherByProvider = new Map<
    Provider,
    OAuthTokenRefresher
  >();
  oauthTokenRefresherByProvider.set("youtube", youtubeOAuthClient);
  oauthTokenRefresherByProvider.set("twitch", twitchDeviceCodeOAuthClient);

  c.register<TokenStore>(AUTH_DI_TOKENS.tokenStore, {
    useClass: KeyringTokenStoreRepository,
  });
  c.registerInstance<ReadonlyMap<Provider, LoginStrategy>>(
    AUTH_DI_TOKENS.loginStrategyByProvider,
    loginStrategyByProvider,
  );
  c.registerInstance<ReadonlyMap<Provider, OAuthTokenRefresher>>(
    AUTH_DI_TOKENS.oauthTokenRefresherByProvider,
    oauthTokenRefresherByProvider,
  );
  c.registerInstance<number>(
    AUTH_DI_TOKENS.accessTokenClockSkewMs,
    options.accessTokenClockSkewMs ?? DEFAULT_ACCESS_TOKEN_CLOCK_SKEW_MS,
  );
  c.registerInstance<AuthorizationLostNotifier>(
    AUTH_DI_TOKENS.authorizationLostNotifier,
    authorizationLostNotifier,
  );
  c.registerInstance<() => number>(AUTH_DI_TOKENS.nowFn, Date.now);

  const tokenStore = c.resolve<TokenStore>(AUTH_DI_TOKENS.tokenStore);
  const loginUsecase = c.resolve(LoginUsecase);
  const getLinkStatusUsecase = c.resolve(GetLinkStatusUsecase);
  const getValidAccessTokenUsecase = c.resolve(GetValidAccessTokenUsecase);
  const refreshAccessTokenUsecase = c.resolve(RefreshAccessTokenUsecase);
  c.registerInstance<RefreshAccessTokenUsecase>(
    AUTH_DI_TOKENS.refreshAccessTokenUsecase,
    refreshAccessTokenUsecase,
  );
  const withAuthorizedRequestUsecase = c.resolve(WithAuthorizedRequestUsecase);
  const createAuthorizedTokenAccessorUsecase = c.resolve(
    CreateAuthorizedTokenAccessorUsecase,
  );

  return {
    async login(provider: Provider): Promise<void> {
      assertSupportedProvider(provider);
      await loginUsecase.login(provider);
    },

    async getLinkStatus(provider: Provider): Promise<LinkStatus> {
      assertSupportedProvider(provider);
      return getLinkStatusUsecase.getLinkStatus(provider);
    },

    async getValidAccessToken(provider: Provider): Promise<string> {
      assertSupportedProvider(provider);
      return getValidAccessTokenUsecase.getValidAccessToken(provider);
    },

    async withAuthorizedRequest<T>(
      provider: Provider,
      requestFn: AuthorizedRequestFn<T>,
    ): Promise<T> {
      assertSupportedProvider(provider);
      return withAuthorizedRequestUsecase.execute(provider, requestFn);
    },

    createAuthorizedTokenAccessor(provider: Provider): AuthorizedTokenAccessor {
      assertSupportedProvider(provider);
      return createAuthorizedTokenAccessorUsecase.createAuthorizedTokenAccessor(
        provider,
      );
    },

    onAuthorizationLost(listener: AuthorizationLostListener): () => void {
      return authorizationLostNotifier.subscribe(listener);
    },

    async refresh(provider: Provider): Promise<string> {
      assertSupportedProvider(provider);
      return refreshAccessTokenUsecase.refresh(provider);
    },

    async logout(provider: Provider): Promise<void> {
      assertSupportedProvider(provider);
      await tokenStore.clear(provider);
    },
  };
}
