import type { Provider } from "../provider.js";
import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import type { LoginStrategy, TokenStore } from "./interfaces/index.js";
import { AUTH_DI_TOKENS } from "../shared/di-tokens.js";

export type LoginUsecaseDeps = {
  loginStrategy: LoginStrategy;
  tokenStore: TokenStore;
};

@injectable()
export class LoginUsecase {
  constructor(
    @inject(AUTH_DI_TOKENS.loginStrategy)
    private readonly loginStrategy: LoginStrategy,
    @inject(AUTH_DI_TOKENS.tokenStore) private readonly tokenStore: TokenStore,
  ) {}

  async login(provider: Provider): Promise<void> {
    const tokenSet = await this.loginStrategy.login();
    await this.tokenStore.save(provider, tokenSet);
  }
}
