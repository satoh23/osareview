import test from "node:test";
import assert from "node:assert/strict";
import type { Provider } from "../provider.js";
import { TokenSet } from "../entities/token/token-set.js";
import type { TokenStore } from "./interfaces/index.js";
import { GetLinkStatusUsecase } from "./get-link-status.usecase.js";

class InMemoryTokenStore implements TokenStore {
  value: TokenSet | null = null;

  async get(): Promise<TokenSet | null> {
    return this.value;
  }

  async save(_provider: Provider, tokenSet: TokenSet): Promise<void> {
    this.value = tokenSet;
  }

  async clear(): Promise<void> {
    this.value = null;
  }
}

test("保存済みトークンがなければ unlinked を返す", async () => {
  const store = new InMemoryTokenStore();
  const usecase = new GetLinkStatusUsecase(store);

  const status = await usecase.getLinkStatus("youtube");

  assert.deepEqual(status, {
    provider: "youtube",
    state: "unlinked",
  });
});

test("保存済みトークンがあれば linked と期限情報を返す", async () => {
  const store = new InMemoryTokenStore();
  store.value = TokenSet.create({
    accessToken: "access-1",
    refreshToken: "refresh-1",
    expiresAt: 1_800_000_000_000,
    scope: "scope.a scope.b",
    obtainedAt: 1_700_000_000_000,
  });
  const usecase = new GetLinkStatusUsecase(store);

  const status = await usecase.getLinkStatus("twitch");

  assert.deepEqual(status, {
    provider: "twitch",
    state: "linked",
    expiresAt: 1_800_000_000_000,
    scope: "scope.a scope.b",
  });
});
