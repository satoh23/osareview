import test from "node:test";
import assert from "node:assert/strict";
import type { Provider } from "../provider.js";
import { TokenSet } from "../entities/token/token-set.js";
import type { RefreshAccessTokenPort, TokenStore } from "./interfaces/index.js";
import { UnauthorizedRequestError } from "../errors/unauthorized-request.error.js";
import { NotAuthorizedError } from "./get-valid-access-token.usecase.js";
import { WithAuthorizedRequestUsecase } from "./with-authorized-request.usecase.js";
import {
  type AuthorizationLostEvent,
  AuthorizationLostNotifier,
} from "../shared/authorization-lost-notifier.js";
import { AUTHORIZATION_LOST_REASON } from "../shared/authorization-reasons.js";

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
  const usecase = new WithAuthorizedRequestUsecase(
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

test("通常時は保存済み access token で requestFn を 1 回だけ実行する", async () => {
  const { refreshUsecase, usecase } = createUsecase();
  const requestTokens: string[] = [];

  const result = await usecase.execute("youtube", async (accessToken) => {
    requestTokens.push(accessToken);
    return "ok";
  });

  assert.equal(result, "ok");
  assert.deepEqual(requestTokens, ["access-1"]);
  assert.deepEqual(refreshUsecase.calls, []);
});

test("UnauthorizedRequestError なら refresh して 1 回だけリトライする", async () => {
  const { refreshUsecase, usecase } = createUsecase();
  const requestTokens: string[] = [];

  const result = await usecase.execute("youtube", async (accessToken) => {
    requestTokens.push(accessToken);
    if (accessToken === "access-1") {
      throw new UnauthorizedRequestError();
    }
    return `ok:${accessToken}`;
  });

  assert.equal(result, "ok:access-new");
  assert.deepEqual(requestTokens, ["access-1", "access-new"]);
  assert.deepEqual(refreshUsecase.calls, ["youtube"]);
});

test("refresh 失敗時は token を clear して通知し NotAuthorizedError を投げる", async () => {
  const { store, refreshUsecase, events, usecase } = createUsecase();
  refreshUsecase.refreshImpl = async () => {
    throw new Error("invalid_grant");
  };

  await assert.rejects(
    usecase.execute("youtube", async () => {
      throw new UnauthorizedRequestError();
    }),
    (err: unknown) => err instanceof NotAuthorizedError,
  );

  assert.deepEqual(store.cleared, ["youtube"]);
  assert.equal(events.length, 1);
  assert.equal(events[0]?.provider, "youtube");
  assert.equal(events[0]?.reason, AUTHORIZATION_LOST_REASON);
  assert.equal(events[0]?.occurredAt, 1_700_000_000_000);
});

test("同一 provider の同時 Unauthorized は refresh を 1 回に集約する", async () => {
  const { refreshUsecase, usecase } = createUsecase();
  let releaseRefresh: (() => void) | undefined;
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  refreshUsecase.refreshImpl = async () => {
    await refreshGate;
    return "access-new";
  };

  const requestFn = async (accessToken: string): Promise<string> => {
    if (accessToken === "access-1") {
      throw new UnauthorizedRequestError();
    }
    return `ok:${accessToken}`;
  };

  const first = usecase.execute("youtube", requestFn);
  const second = usecase.execute("youtube", requestFn);
  releaseRefresh?.();

  const results = await Promise.all([first, second]);

  assert.deepEqual(results, ["ok:access-new", "ok:access-new"]);
  assert.deepEqual(refreshUsecase.calls, ["youtube"]);
});
