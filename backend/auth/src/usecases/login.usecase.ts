import type { Provider } from "../provider.js";
import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import type { LoginStrategy, TokenStore } from "./interfaces/index.js";
import { AUTH_DI_TOKENS } from "../shared/di-tokens.js";
import { NotAuthorizedError } from "./get-valid-access-token.usecase.js";

export type LoginUsecaseDeps = {
  loginStrategyByProvider: ReadonlyMap<Provider, LoginStrategy>;
  tokenStore: TokenStore;
};

@injectable()
export class LoginUsecase {
  constructor(
    @inject(AUTH_DI_TOKENS.loginStrategyByProvider)
    private readonly loginStrategyByProvider: ReadonlyMap<
      Provider,
      LoginStrategy
    >,
    @inject(AUTH_DI_TOKENS.tokenStore) private readonly tokenStore: TokenStore,
  ) {}

  async login(provider: Provider): Promise<void> {
    const loginStrategy = this.loginStrategyByProvider.get(provider);
    if (loginStrategy === undefined) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    try {
      const tokenSet = await loginStrategy.login();
      await this.tokenStore.save(provider, tokenSet);
    } catch (err) {
      if (err instanceof NotAuthorizedError) {
        throw err;
      }
      throw new NotAuthorizedError(
        "Authorization failed. Please login again.",
        { cause: err },
      );
    }
  }
}
