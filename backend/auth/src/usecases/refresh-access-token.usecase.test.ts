import test from "node:test";
import assert from "node:assert/strict";
import type { Provider } from "../provider.js";
import { TokenSet } from "../entities/token/token-set.js";
import type {
  OAuthClient,
  OAuthTokenRefresher,
  TokenStore,
} from "./interfaces/index.js";
import { NotAuthorizedError } from "./get-valid-access-token.usecase.js";
import { RefreshAccessTokenUsecase } from "./refresh-access-token.usecase.js";

const makeTokenSet = (overrides?: Partial<TokenSet>): TokenSet =>
  TokenSet.create({
    accessToken: "access-1",
    refreshToken: "refresh-1",
    expiresAt: Date.now() + 3600_000,
    scope: "scope.a",
    obtainedAt: Date.now(),
    ...(overrides
      ? {
          accessToken: overrides.accessToken ?? "access-1",
          refreshToken: overrides.refreshToken ?? "refresh-1",
          expiresAt: overrides.expiresAt ?? Date.now() + 3600_000,
          scope: overrides.scope ?? "scope.a",
          obtainedAt: overrides.obtainedAt ?? Date.now(),
        }
      : {}),
  });

class InMemoryTokenStore implements TokenStore {
  value: TokenSet | null = null;
  saved: { provider: Provider; token: TokenSet }[] = [];
  cleared: Provider[] = [];

  async get(): Promise<TokenSet | null> {
    return this.value;
  }

  async save(provider: Provider, tokenSet: TokenSet): Promise<void> {
    this.value = tokenSet;
    this.saved.push({ provider, token: tokenSet });
  }

  async clear(provider: Provider): Promise<void> {
    this.value = null;
    this.cleared.push(provider);
  }
}

class StubOAuthClient implements OAuthClient {
  refreshedWith: string | null = null;
  refreshImpl: OAuthClient["refresh"] = async () => makeTokenSet();

  authorize(): URL {
    throw new Error("not used");
  }

  async exchange(): Promise<TokenSet> {
    throw new Error("not used");
  }

  async refresh(input: { refreshToken: string }): Promise<TokenSet> {
    this.refreshedWith = input.refreshToken;
    return this.refreshImpl(input);
  }
}

test("明示 refresh で新しい token を返して保存する", async () => {
  const store = new InMemoryTokenStore();
  const oauth = new StubOAuthClient();
  store.value = makeTokenSet({ refreshToken: "refresh-old" });
  oauth.refreshImpl = async () =>
    TokenSet.create({
      accessToken: "access-new",
      refreshToken: "refresh-new",
      expiresAt: Date.now() + 7200_000,
      scope: "scope.a",
      obtainedAt: Date.now(),
    });

  const refresherByProvider: ReadonlyMap<Provider, OAuthTokenRefresher> =
    new Map([["youtube", oauth]]);
  const usecase = new RefreshAccessTokenUsecase(store, refresherByProvider);
  const result = await usecase.refresh("youtube");

  assert.equal(result, "access-new");
  assert.equal(oauth.refreshedWith, "refresh-old");
  assert.equal(store.saved.length, 1);
  assert.equal(store.cleared.length, 0);
});

test("未ログイン状態の明示 refresh は NotAuthorizedError", async () => {
  const store = new InMemoryTokenStore();
  const oauth = new StubOAuthClient();
  const refresherByProvider: ReadonlyMap<Provider, OAuthTokenRefresher> =
    new Map([["youtube", oauth]]);
  const usecase = new RefreshAccessTokenUsecase(store, refresherByProvider);

  await assert.rejects(
    usecase.refresh("youtube"),
    (err: unknown) => err instanceof NotAuthorizedError,
  );
});

test("refresh 失敗時は clear して NotAuthorizedError", async () => {
  const store = new InMemoryTokenStore();
  const oauth = new StubOAuthClient();
  store.value = makeTokenSet({ refreshToken: "refresh-old" });
  oauth.refreshImpl = async () => {
    throw new Error("invalid_grant");
  };
  const refresherByProvider: ReadonlyMap<Provider, OAuthTokenRefresher> =
    new Map([["youtube", oauth]]);
  const usecase = new RefreshAccessTokenUsecase(store, refresherByProvider);

  await assert.rejects(
    usecase.refresh("youtube"),
    (err: unknown) => err instanceof NotAuthorizedError,
  );
  assert.deepEqual(store.cleared, ["youtube"]);
});
