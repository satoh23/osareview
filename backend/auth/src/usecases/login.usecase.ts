import type { Provider } from "../provider.js";
import type {
  OAuthClient,
  TokenStore,
  BrowserLauncher,
  OAuthCallbackReceiver,
  PkceGenerator,
  StateGenerator,
  LoginPolicy,
} from "./interfaces/index.js";

export type LoginUsecaseDeps = {
  tokenStore: TokenStore;
  oauthClient: OAuthClient;
  browserLauncher: BrowserLauncher;
  callbackReceiver: OAuthCallbackReceiver;
  pkceGenerator: PkceGenerator;
  stateGenerator: StateGenerator;
  loginPolicy: LoginPolicy;
};

export class LoginUsecase {
  constructor(private readonly deps: LoginUsecaseDeps) {}

  async login(provider: Provider): Promise<void> {
    const pkce = this.deps.pkceGenerator.generate();
    const state = this.deps.stateGenerator.generate();
    const callback = await this.deps.callbackReceiver.start({
      expectedState: state,
      timeoutMs: this.deps.loginPolicy.getCallbackTimeoutMs(provider),
    });

    try {
      const authorizationUrl = this.deps.oauthClient.authorize({
        redirectUri: callback.redirectUri,
        state,
        codeVerifier: pkce.codeVerifier,
        codeChallenge: pkce.codeChallenge,
        scopes: this.deps.loginPolicy.getScopes(provider),
      });
      // NOTE: ユーザー同意フローをブラウザで開始し、loopback callback で認可コードを受け取る。
      await this.deps.browserLauncher.open(authorizationUrl);
      const code = await callback.waitForAuthorizationCode();
      const tokenSet = await this.deps.oauthClient.exchange({
        code,
        codeVerifier: pkce.codeVerifier,
        redirectUri: callback.redirectUri,
      });
      await this.deps.tokenStore.save(provider, tokenSet);
    } finally {
      await callback.close();
    }
  }
}
