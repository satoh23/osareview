export const AUTH_DI_TOKENS = {
  tokenStore: Symbol("auth.tokenStore"),
  oauthClient: Symbol("auth.oauthClient"),
  browserLauncher: Symbol("auth.browserLauncher"),
  callbackReceiver: Symbol("auth.callbackReceiver"),
  pkceGenerator: Symbol("auth.pkceGenerator"),
  stateGenerator: Symbol("auth.stateGenerator"),
  loginPolicy: Symbol("auth.loginPolicy"),
  oauthConfigProvider: Symbol("auth.oauthConfigProvider"),
  accessTokenClockSkewMs: Symbol("auth.accessTokenClockSkewMs"),
} as const;
