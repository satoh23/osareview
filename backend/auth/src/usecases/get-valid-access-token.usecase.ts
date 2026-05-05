import type { Provider } from "../provider.js";
import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import type { OAuthClient, TokenStore } from "./interfaces/index.js";
import { DEFAULT_ACCESS_TOKEN_CLOCK_SKEW_MS } from "../entities/token/token-set.js";
import { AUTH_DI_TOKENS } from "../shared/di-tokens.js";

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

@injectable()
export class GetValidAccessTokenUsecase {
  private readonly accessTokenClockSkewMs: number;

  constructor(
    @inject(AUTH_DI_TOKENS.tokenStore) private readonly tokenStore: TokenStore,
    @inject(AUTH_DI_TOKENS.oauthClient)
    private readonly oauthClient: OAuthClient,
    @inject(AUTH_DI_TOKENS.accessTokenClockSkewMs)
    accessTokenClockSkewMs?: number,
  ) {
    this.accessTokenClockSkewMs =
      accessTokenClockSkewMs ?? DEFAULT_ACCESS_TOKEN_CLOCK_SKEW_MS;
  }

  async getValidAccessToken(provider: Provider): Promise<string> {
    const tokenSet = await this.tokenStore.get(provider);
    if (tokenSet === null) {
      throw new NotAuthorizedError("Not authorized. Please login first.");
    }

    if (tokenSet.isAccessTokenLive(this.accessTokenClockSkewMs)) {
      return tokenSet.accessToken;
    }

    try {
      const refreshed = await this.oauthClient.refresh({
        refreshToken: tokenSet.refreshToken,
      });
      await this.tokenStore.save(provider, refreshed);
      return refreshed.accessToken;
    } catch (err) {
      await this.tokenStore.clear(provider);
      throw new NotAuthorizedError(
        "Authorization expired. Please login again.",
        { cause: err },
      );
    }
  }
}
