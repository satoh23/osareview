import test from "node:test";
import assert from "node:assert/strict";
import { TokenSet } from "../entities/token/token-set.js";
import { LoginUsecase } from "./login.usecase.js";
import { NotAuthorizedError } from "./get-valid-access-token.usecase.js";
import type { LoginStrategy, TokenStore } from "./interfaces/index.js";
import type { Provider } from "../provider.js";

class FakeTokenStore implements TokenStore {
  saved: { provider: Provider; tokenSet: TokenSet } | null = null;
  async get(): Promise<TokenSet | null> {
    return null;
  }
  async save(provider: Provider, tokenSet: TokenSet): Promise<void> {
    this.saved = { provider, tokenSet };
  }
  async clear(): Promise<void> {}
}

class StubLoginStrategy implements LoginStrategy {
  calls = 0;
  tokenSet = TokenSet.create({
    accessToken: "a",
    refreshToken: "r",
    expiresAt: 10_000,
    scope: "s",
    obtainedAt: 1_000,
  });

  async login(): Promise<TokenSet> {
    this.calls += 1;
    return this.tokenSet;
  }
}

test("login: strategy が返した tokenSet を provider 付きで保存する", async () => {
  const loginStrategy = new StubLoginStrategy();
  const tokenStore = new FakeTokenStore();
  const usecase = new LoginUsecase(
    new Map([["youtube", loginStrategy]]),
    tokenStore,
  );

  await usecase.login("youtube");

  assert.equal(loginStrategy.calls, 1);
  assert.equal(tokenStore.saved?.provider, "youtube");
  assert.equal(tokenStore.saved?.tokenSet.accessToken, "a");
});

test("login: strategy 失敗時は NotAuthorizedError に正規化する", async () => {
  const tokenStore = new FakeTokenStore();
  const strategy: LoginStrategy = {
    async login(): Promise<TokenSet> {
      throw new Error("device flow expired");
    },
  };
  const usecase = new LoginUsecase(new Map([["twitch", strategy]]), tokenStore);

  await assert.rejects(
    usecase.login("twitch"),
    (err: unknown) =>
      err instanceof NotAuthorizedError &&
      err.message === "Authorization failed. Please login again.",
  );
  assert.equal(tokenStore.saved, null);
});
