import test from "node:test";
import assert from "node:assert/strict";
import { TokenSet } from "../../../entities/token/token-set.js";
import { AuthorizationCodeLoopbackLoginStrategy } from "./authorization-code-loopback-login-strategy.js";
import type {
  BrowserLauncher,
  LoginPolicy,
  OAuthCallbackReceiver,
  OAuthCallbackSession,
  OAuthClient,
  PkceGenerator,
  StateGenerator,
} from "../../../usecases/interfaces/index.js";

class FakeOAuthClient implements OAuthClient {
  authorizeInput: Parameters<OAuthClient["authorize"]>[0] | null = null;
  exchangeInput: Parameters<OAuthClient["exchange"]>[0] | null = null;
  authorize(request: Parameters<OAuthClient["authorize"]>[0]): URL {
    this.authorizeInput = request;
    return new URL("https://accounts.example.com/auth?x=1");
  }
  async exchange(
    input: Parameters<OAuthClient["exchange"]>[0],
  ): Promise<TokenSet> {
    this.exchangeInput = input;
    return TokenSet.create({
      accessToken: "a",
      refreshToken: "r",
      expiresAt: 10_000,
      scope: "s",
      obtainedAt: 1_000,
    });
  }
  async refresh(): Promise<TokenSet> {
    throw new Error("not used");
  }
}

class FakeBrowserLauncher implements BrowserLauncher {
  opened: URL | null = null;
  async open(url: URL): Promise<void> {
    this.opened = url;
  }
}

class FakeCallbackSession implements OAuthCallbackSession {
  constructor(
    readonly redirectUri: string,
    private readonly code: string,
  ) {}
  closed = false;
  async waitForAuthorizationCode(): Promise<string> {
    return this.code;
  }
  async close(): Promise<void> {
    this.closed = true;
  }
}

class FakeCallbackReceiver implements OAuthCallbackReceiver {
  started: {
    expectedState: string;
    timeoutMs: number;
    session: FakeCallbackSession;
  } | null = null;
  async start(input: { expectedState: string; timeoutMs: number }) {
    const session = new FakeCallbackSession(
      "http://127.0.0.1:33445/callback",
      "code-123",
    );
    this.started = { ...input, session };
    return session;
  }
}

class FixedPkceGenerator implements PkceGenerator {
  generate() {
    return {
      codeVerifier: "verifier-1",
      codeChallenge: "challenge-1",
      codeChallengeMethod: "S256" as const,
    };
  }
}

class FixedStateGenerator implements StateGenerator {
  generate(): string {
    return "state-1";
  }
}

class FixedLoginPolicy implements LoginPolicy {
  getScopes(): readonly string[] {
    return ["scope.a", "scope.b"];
  }
  getCallbackTimeoutMs(): number {
    return 20_000;
  }
}

test("login: browser -> callback -> exchange を結線する", async () => {
  const oauthClient = new FakeOAuthClient();
  const browserLauncher = new FakeBrowserLauncher();
  const callbackReceiver = new FakeCallbackReceiver();

  const strategy = new AuthorizationCodeLoopbackLoginStrategy(
    oauthClient,
    browserLauncher,
    callbackReceiver,
    new FixedPkceGenerator(),
    new FixedStateGenerator(),
    new FixedLoginPolicy(),
  );

  const tokenSet = await strategy.login();

  assert.deepEqual(callbackReceiver.started?.expectedState, "state-1");
  assert.deepEqual(callbackReceiver.started?.timeoutMs, 20_000);
  assert.equal(
    browserLauncher.opened?.toString(),
    "https://accounts.example.com/auth?x=1",
  );
  assert.deepEqual(oauthClient.authorizeInput, {
    redirectUri: "http://127.0.0.1:33445/callback",
    state: "state-1",
    codeVerifier: "verifier-1",
    codeChallenge: "challenge-1",
    scopes: ["scope.a", "scope.b"],
  });
  assert.deepEqual(oauthClient.exchangeInput, {
    code: "code-123",
    codeVerifier: "verifier-1",
    redirectUri: "http://127.0.0.1:33445/callback",
  });
  assert.equal(tokenSet.accessToken, "a");
  assert.equal(callbackReceiver.started?.session.closed, true);
});
