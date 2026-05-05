import type { Provider } from "../provider.js";
import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import type {
  OAuthClient,
  TokenStore,
  BrowserLauncher,
  OAuthCallbackReceiver,
  PkceGenerator,
  StateGenerator,
  LoginPolicy,
} from "./interfaces/index.js";
import { AUTH_DI_TOKENS } from "../shared/di-tokens.js";

export type LoginUsecaseDeps = {
  tokenStore: TokenStore;
  oauthClient: OAuthClient;
  browserLauncher: BrowserLauncher;
  callbackReceiver: OAuthCallbackReceiver;
  pkceGenerator: PkceGenerator;
  stateGenerator: StateGenerator;
  loginPolicy: LoginPolicy;
};

@injectable()
export class LoginUsecase {
  constructor(
    @inject(AUTH_DI_TOKENS.tokenStore) private readonly tokenStore: TokenStore,
    @inject(AUTH_DI_TOKENS.oauthClient)
    private readonly oauthClient: OAuthClient,
    @inject(AUTH_DI_TOKENS.browserLauncher)
    private readonly browserLauncher: BrowserLauncher,
    @inject(AUTH_DI_TOKENS.callbackReceiver)
    private readonly callbackReceiver: OAuthCallbackReceiver,
    @inject(AUTH_DI_TOKENS.pkceGenerator)
    private readonly pkceGenerator: PkceGenerator,
    @inject(AUTH_DI_TOKENS.stateGenerator)
    private readonly stateGenerator: StateGenerator,
    @inject(AUTH_DI_TOKENS.loginPolicy)
    private readonly loginPolicy: LoginPolicy,
  ) {}

  async login(provider: Provider): Promise<void> {
    const pkce = this.pkceGenerator.generate();
    const state = this.stateGenerator.generate();
    const callback = await this.callbackReceiver.start({
      expectedState: state,
      timeoutMs: this.loginPolicy.getCallbackTimeoutMs(),
    });

    try {
      const authorizationUrl = this.oauthClient.authorize({
        redirectUri: callback.redirectUri,
        state,
        codeVerifier: pkce.codeVerifier,
        codeChallenge: pkce.codeChallenge,
        scopes: this.loginPolicy.getScopes(),
      });
      // NOTE: ユーザー同意フローをブラウザで開始し、loopback callback で認可コードを受け取る。
      await this.browserLauncher.open(authorizationUrl);
      const code = await callback.waitForAuthorizationCode();
      const tokenSet = await this.oauthClient.exchange({
        code,
        codeVerifier: pkce.codeVerifier,
        redirectUri: callback.redirectUri,
      });
      await this.tokenStore.save(provider, tokenSet);
    } finally {
      await callback.close();
    }
  }
}
