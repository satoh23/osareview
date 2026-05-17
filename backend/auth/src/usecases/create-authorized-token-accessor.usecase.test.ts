import test from "node:test";
import assert from "node:assert/strict";
import type { Provider } from "../provider.js";
import { TokenSet } from "../entities/token/token-set.js";
import type { RefreshAccessTokenPort, TokenStore } from "./interfaces/index.js";
import { NotAuthorizedError } from "./get-valid-access-token.usecase.js";
import {
  type AuthorizationLostEvent,
  AuthorizationLostNotifier,
} from "../shared/authorization-lost-notifier.js";
import { AUTHORIZATION_LOST_REASON } from "../shared/authorization-reasons.js";
import { CreateAuthorizedTokenAccessorUsecase } from "./create-authorized-token-accessor.usecase.js";

const makeTokenSet = (accessToken: string): TokenSet =>
  TokenSet.create({
    accessToken,
    refreshToken: "refresh-1",
    expiresAt: Date.now() + 3600_000,
    scope: "scope.a",
    obtainedAt: Date.now(),
  });

class InMemoryTokenStore implements TokenStore {
  value: TokenSet | null = makeTokenSet("access-1");
  cleared: Provider[] = [];

  async get(): Promise<TokenSet | null> {
    return this.value;
  }

  async save(_provider: Provider, tokenSet: TokenSet): Promise<void> {
    this.value = tokenSet;
  }

  async clear(provider: Provider): Promise<void> {
    this.value = null;
    this.cleared.push(provider);
  }
}

class StubRefreshUsecase implements RefreshAccessTokenPort {
  calls: Provider[] = [];
  refreshImpl: RefreshAccessTokenPort["refresh"] = async () => "access-new";

  async refresh(provider: Provider): Promise<string> {
    this.calls.push(provider);
    return this.refreshImpl(provider);
  }
}

const createUsecase = () => {
  const store = new InMemoryTokenStore();
  const refreshUsecase = new StubRefreshUsecase();
  const notifier = new AuthorizationLostNotifier();
  const events: AuthorizationLostEvent[] = [];
  notifier.subscribe((event) => events.push(event));
  const usecase = new CreateAuthorizedTokenAccessorUsecase(
    store,
    refreshUsecase,
    notifier,
    () => 1_700_000_000_000,
  );

  return {
    store,
    refreshUsecase,
    events,
    usecase,
  };
};

test("getCurrentAccessToken は保存済み access token を返す", async () => {
  const { refreshUsecase, usecase } = createUsecase();
  const accessor = usecase.createAuthorizedTokenAccessor("youtube");

  const result = await accessor.getCurrentAccessToken();

  assert.equal(result, "access-1");
  assert.deepEqual(refreshUsecase.calls, []);
});

test("getCurrentAccessToken は未ログインなら NotAuthorizedError", async () => {
  const { store, usecase } = createUsecase();
  store.value = null;
  const accessor = usecase.createAuthorizedTokenAccessor("youtube");

  await assert.rejects(
    accessor.getCurrentAccessToken(),
    (err: unknown) => err instanceof NotAuthorizedError,
  );
});

test("refresh は refreshUsecase の新しい access token を返す", async () => {
  const { refreshUsecase, usecase } = createUsecase();
  const accessor = usecase.createAuthorizedTokenAccessor("twitch");

  const result = await accessor.refresh();

  assert.equal(result, "access-new");
  assert.deepEqual(refreshUsecase.calls, ["twitch"]);
});

test("refresh 失敗時は token を clear して通知し NotAuthorizedError を投げる", async () => {
  const { store, refreshUsecase, events, usecase } = createUsecase();
  refreshUsecase.refreshImpl = async () => {
    throw new Error("invalid_grant");
  };
  const accessor = usecase.createAuthorizedTokenAccessor("youtube");

  await assert.rejects(
    accessor.refresh(),
    (err: unknown) => err instanceof NotAuthorizedError,
  );

  assert.deepEqual(store.cleared, ["youtube"]);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.provider, "youtube");
  assert.equal(events[0]?.reason, AUTHORIZATION_LOST_REASON);
  assert.equal(events[0]?.occurredAt, 1_700_000_000_000);
});
