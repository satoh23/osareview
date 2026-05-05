import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import type { Provider } from "../provider.js";
import type { OAuthTokenRefresher, TokenStore } from "./interfaces/index.js";
import { AUTH_DI_TOKENS } from "../shared/di-tokens.js";
import { NotAuthorizedError } from "./get-valid-access-token.usecase.js";

@injectable()
export class RefreshAccessTokenUsecase {
  constructor(
    @inject(AUTH_DI_TOKENS.tokenStore) private readonly tokenStore: TokenStore,
    @inject(AUTH_DI_TOKENS.oauthTokenRefresherByProvider)
    private readonly oauthTokenRefresherByProvider: ReadonlyMap<
      Provider,
      OAuthTokenRefresher
    >,
  ) {}

  async refresh(provider: Provider): Promise<string> {
    const oauthTokenRefresher =
      this.oauthTokenRefresherByProvider.get(provider);
    if (oauthTokenRefresher === undefined) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const tokenSet = await this.tokenStore.get(provider);
    if (tokenSet === null) {
      throw new NotAuthorizedError("Not authorized. Please login first.");
    }

    try {
      const refreshed = await oauthTokenRefresher.refresh({
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
