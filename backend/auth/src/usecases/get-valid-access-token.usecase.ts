import type { Provider } from "../provider.js";
import type { OAuthClient, TokenStore } from "./interfaces/index.js";
import { DEFAULT_ACCESS_TOKEN_CLOCK_SKEW_MS } from "../entities/token/token-set.js";

export class NotAuthorizedError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NotAuthorizedError";
  }
}

export type GetValidAccessTokenUsecaseDeps = {
  tokenStore: TokenStore;
  oauthClient: OAuthClient;
  accessTokenClockSkewMs?: number;
};

export class GetValidAccessTokenUsecase {
  private readonly accessTokenClockSkewMs: number;

  constructor(private readonly deps: GetValidAccessTokenUsecaseDeps) {
    this.accessTokenClockSkewMs =
      deps.accessTokenClockSkewMs ?? DEFAULT_ACCESS_TOKEN_CLOCK_SKEW_MS;
  }

  async getValidAccessToken(provider: Provider): Promise<string> {
    const tokenSet = await this.deps.tokenStore.get(provider);
    if (tokenSet === null) {
      throw new NotAuthorizedError("Not authorized. Please login first.");
    }

    if (tokenSet.isAccessTokenLive(this.accessTokenClockSkewMs)) {
      return tokenSet.accessToken;
    }

    try {
      const refreshed = await this.deps.oauthClient.refresh({
        refreshToken: tokenSet.refreshToken,
      });
      await this.deps.tokenStore.save(provider, refreshed);
      return refreshed.accessToken;
    } catch (err) {
      await this.deps.tokenStore.clear(provider);
      throw new NotAuthorizedError(
        "Authorization expired. Please login again.",
        { cause: err },
      );
    }
  }
}
