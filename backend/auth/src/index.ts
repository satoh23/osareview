import "reflect-metadata";
import type { Provider } from "./provider.js";
import { container } from "tsyringe";
import { KeyringTokenStoreRepository } from "./adapters/keyring/repository/token-store.repository.js";
import { YouTubeOAuthClient } from "./adapters/youtube/client/oauth.client.js";
import { EnvYouTubeOAuthConfigProvider } from "./infrastructure/youtube/config/oauth-config.js";
import { OpenBrowserLauncher } from "./adapters/shared/browser/browser.launcher.js";
import { LoopbackOAuthCallbackReceiver } from "./adapters/shared/loopback/loopback.callback-receiver.js";
import { RandomPkceGenerator } from "./adapters/shared/pkce/pkce.js";
import { RandomStateGenerator } from "./adapters/shared/state/random-state.generator.js";
import { YouTubeLoginPolicy } from "./adapters/youtube/config/login-policy.js";
import { AuthorizationCodeLoopbackLoginStrategy } from "./adapters/youtube/login/authorization-code-loopback-login-strategy.js";
import { LoginUsecase } from "./usecases/login.usecase.js";
import {
  GetValidAccessTokenUsecase,
  NotAuthorizedError,
} from "./usecases/get-valid-access-token.usecase.js";
import { RefreshAccessTokenUsecase } from "./usecases/refresh-access-token.usecase.js";
import { AUTH_DI_TOKENS } from "./shared/di-tokens.js";
import { DEFAULT_ACCESS_TOKEN_CLOCK_SKEW_MS } from "./entities/token/token-set.js";
import type {
  BrowserLauncher,
  LoginPolicy,
  LoginStrategy,
  OAuthCallbackReceiver,
  OAuthClient,
  PkceGenerator,
  StateGenerator,
  TokenStore,
} from "./usecases/interfaces/index.js";
import type { YouTubeOAuthConfigProvider } from "./infrastructure/youtube/config/oauth-config.js";

export type { Provider };
export { NotAuthorizedError };

export interface AuthClient {
  login(provider: Provider): Promise<void>;
  getValidAccessToken(provider: Provider): Promise<string>;
  refresh(provider: Provider): Promise<string>;
  logout(provider: Provider): Promise<void>;
}

export type CreateAuthClientOptions = {
  accessTokenClockSkewMs?: number;
};

function assertSupportedProvider(provider: Provider): void {
  if (provider !== "youtube") {
    throw new Error(`Unsupported provider: ${provider}`);
  }
}

export function createAuthClient(
  options: CreateAuthClientOptions = {},
): AuthClient {
  const c = container.createChildContainer();
  c.register<TokenStore>(AUTH_DI_TOKENS.tokenStore, {
    useClass: KeyringTokenStoreRepository,
  });
  c.register<YouTubeOAuthConfigProvider>(AUTH_DI_TOKENS.oauthConfigProvider, {
    useClass: EnvYouTubeOAuthConfigProvider,
  });
  c.register<OAuthClient>(AUTH_DI_TOKENS.oauthClient, {
    useClass: YouTubeOAuthClient,
  });
  c.register<BrowserLauncher>(AUTH_DI_TOKENS.browserLauncher, {
    useClass: OpenBrowserLauncher,
  });
  c.register<OAuthCallbackReceiver>(AUTH_DI_TOKENS.callbackReceiver, {
    useClass: LoopbackOAuthCallbackReceiver,
  });
  c.register<PkceGenerator>(AUTH_DI_TOKENS.pkceGenerator, {
    useClass: RandomPkceGenerator,
  });
  c.register<StateGenerator>(AUTH_DI_TOKENS.stateGenerator, {
    useClass: RandomStateGenerator,
  });
  c.register<LoginPolicy>(AUTH_DI_TOKENS.loginPolicy, {
    useClass: YouTubeLoginPolicy,
  });
  c.register<LoginStrategy>(AUTH_DI_TOKENS.loginStrategy, {
    useClass: AuthorizationCodeLoopbackLoginStrategy,
  });
  c.registerInstance<number>(
    AUTH_DI_TOKENS.accessTokenClockSkewMs,
    options.accessTokenClockSkewMs ?? DEFAULT_ACCESS_TOKEN_CLOCK_SKEW_MS,
  );

  const tokenStore = c.resolve<TokenStore>(AUTH_DI_TOKENS.tokenStore);
  const loginUsecase = c.resolve(LoginUsecase);
  const getValidAccessTokenUsecase = c.resolve(GetValidAccessTokenUsecase);
  const refreshAccessTokenUsecase = c.resolve(RefreshAccessTokenUsecase);

  return {
    async login(provider: Provider): Promise<void> {
      assertSupportedProvider(provider);
      await loginUsecase.login(provider);
    },

    async getValidAccessToken(provider: Provider): Promise<string> {
      assertSupportedProvider(provider);
      return getValidAccessTokenUsecase.getValidAccessToken(provider);
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
