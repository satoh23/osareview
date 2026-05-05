import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import type { Provider } from "../provider.js";
import type { OAuthClient, TokenStore } from "./interfaces/index.js";
import { AUTH_DI_TOKENS } from "../shared/di-tokens.js";
import { NotAuthorizedError } from "./get-valid-access-token.usecase.js";

@injectable()
export class RefreshAccessTokenUsecase {
  constructor(
    @inject(AUTH_DI_TOKENS.tokenStore) private readonly tokenStore: TokenStore,
    @inject(AUTH_DI_TOKENS.oauthClient)
    private readonly oauthClient: OAuthClient,
  ) {}

  async refresh(provider: Provider): Promise<string> {
    const tokenSet = await this.tokenStore.get(provider);
    if (tokenSet === null) {
      throw new NotAuthorizedError("Not authorized. Please login first.");
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
