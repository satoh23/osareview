import test from "node:test";
import assert from "node:assert/strict";
import { TokenSet } from "../entities/token/token-set.js";
import {
  GetValidAccessTokenUsecase,
  NotAuthorizedError,
} from "./get-valid-access-token.usecase.js";
import type { OAuthClient, TokenStore } from "./interfaces/index.js";
import type { Provider } from "../provider.js";

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

test("保存済みトークンが有効ならそのまま返す", async () => {
  const store = new InMemoryTokenStore();
  const oauth = new StubOAuthClient();
  store.value = makeTokenSet({ accessToken: "live-token" });

  const usecase = new GetValidAccessTokenUsecase(store, oauth);

  const result = await usecase.getValidAccessToken("youtube");
  assert.equal(result, "live-token");
  assert.equal(oauth.refreshedWith, null);
  assert.equal(store.saved.length, 0);
  assert.equal(store.cleared.length, 0);
});

test("未ログインなら NotAuthorizedError", async () => {
  const store = new InMemoryTokenStore();
  const oauth = new StubOAuthClient();

  const usecase = new GetValidAccessTokenUsecase(store, oauth);

  await assert.rejects(
    usecase.getValidAccessToken("youtube"),
    (err: unknown) => err instanceof NotAuthorizedError,
  );
});

test("期限切れなら refresh して保存した token を返す", async () => {
  const store = new InMemoryTokenStore();
  const oauth = new StubOAuthClient();
  store.value = makeTokenSet({
    accessToken: "expired",
    expiresAt: Date.now() - 1,
    refreshToken: "refresh-old",
  });
  oauth.refreshImpl = async () =>
    TokenSet.create({
      accessToken: "access-new",
      refreshToken: "refresh-new",
      expiresAt: Date.now() + 7200_000,
      scope: "scope.a",
      obtainedAt: Date.now(),
    });

  const usecase = new GetValidAccessTokenUsecase(store, oauth);

  const result = await usecase.getValidAccessToken("youtube");
  assert.equal(result, "access-new");
  assert.equal(oauth.refreshedWith, "refresh-old");
  assert.equal(store.saved.length, 1);
  assert.equal(store.cleared.length, 0);
});

test("refresh 失敗なら clear して NotAuthorizedError", async () => {
  const store = new InMemoryTokenStore();
  const oauth = new StubOAuthClient();
  store.value = makeTokenSet({
    accessToken: "expired",
    expiresAt: Date.now() - 1,
    refreshToken: "refresh-old",
  });
  oauth.refreshImpl = async () => {
    throw new Error("invalid_grant");
  };

  const usecase = new GetValidAccessTokenUsecase(store, oauth);

  await assert.rejects(
    usecase.getValidAccessToken("youtube"),
    (err: unknown) => err instanceof NotAuthorizedError,
  );
  assert.deepEqual(store.cleared, ["youtube"]);
});
