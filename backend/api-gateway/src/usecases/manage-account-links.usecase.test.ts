import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNT_LINK_STATES,
  SESSION_PLATFORMS,
  type AccountLinkProvider,
} from "@comment-dock/shared";
import type {
  AuthClient,
  AuthorizedTokenAccessor,
  AuthorizationLostListener,
  LinkStatus,
  Provider,
} from "@comment-dock/auth";
import {
  type AccountStateOutputEvent,
  type AccountStateOutputPort,
} from "./interfaces/account-state-output-port.interface.js";
import { ManageAccountLinksUseCase } from "./manage-account-links.usecase.js";

class StubAuthClient implements AuthClient {
  linkStatuses = new Map<Provider, LinkStatus>();
  loginCalls: Provider[] = [];
  logoutCalls: Provider[] = [];
  loginImpl: AuthClient["login"] = async () => {};

  async login(provider: Provider): Promise<void> {
    this.loginCalls.push(provider);
    await this.loginImpl(provider);
  }

  async getLinkStatus(provider: Provider): Promise<LinkStatus> {
    return (
      this.linkStatuses.get(provider) ?? {
        provider,
        state: "unlinked",
      }
    );
  }

  async getValidAccessToken(): Promise<string> {
    throw new Error("not used");
  }

  async withAuthorizedRequest<T>(): Promise<T> {
    throw new Error("not used");
  }

  createAuthorizedTokenAccessor(): AuthorizedTokenAccessor {
    throw new Error("not used");
  }

  onAuthorizationLost(_listener: AuthorizationLostListener): () => void {
    return () => {};
  }

  async refresh(): Promise<string> {
    throw new Error("not used");
  }

  async logout(provider: Provider): Promise<void> {
    this.logoutCalls.push(provider);
  }
}

const createUseCase = (): {
  authClient: StubAuthClient;
  published: AccountStateOutputEvent[];
  useCase: ManageAccountLinksUseCase;
} => {
  const authClient = new StubAuthClient();
  const published: AccountStateOutputEvent[] = [];
  const outputPort: AccountStateOutputPort = {
    async publishAccountState(event) {
      published.push(event);
    },
  };

  return {
    authClient,
    published,
    useCase: new ManageAccountLinksUseCase(authClient, outputPort),
  };
};

test("initialize は auth の連携状態から provider ごとの初期状態を確定する", async () => {
  const { authClient, published, useCase } = createUseCase();
  authClient.linkStatuses.set(SESSION_PLATFORMS.YOUTUBE, {
    provider: SESSION_PLATFORMS.YOUTUBE,
    state: "linked",
  });

  await useCase.initialize();

  assert.deepEqual(useCase.getSnapshot(), {
    [SESSION_PLATFORMS.YOUTUBE]: {
      provider: SESSION_PLATFORMS.YOUTUBE,
      state: ACCOUNT_LINK_STATES.LINKED,
    },
    [SESSION_PLATFORMS.TWITCH]: {
      provider: SESSION_PLATFORMS.TWITCH,
      state: ACCOUNT_LINK_STATES.UNLINKED,
    },
  });
  assert.deepEqual(published, []);
});

test("link は linking を返し、login 成功後に linked を publish する", async () => {
  const { authClient, published, useCase } = createUseCase();

  const result = await useCase.link(SESSION_PLATFORMS.YOUTUBE);
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.deepEqual(result, {
    provider: SESSION_PLATFORMS.YOUTUBE,
    state: ACCOUNT_LINK_STATES.LINKING,
  });
  assert.deepEqual(authClient.loginCalls, [SESSION_PLATFORMS.YOUTUBE]);
  assert.deepEqual(published, [
    {
      provider: SESSION_PLATFORMS.YOUTUBE,
      state: ACCOUNT_LINK_STATES.LINKING,
    },
    {
      provider: SESSION_PLATFORMS.YOUTUBE,
      state: ACCOUNT_LINK_STATES.LINKED,
    },
  ]);
});

test("link 失敗時は failed と reason を publish する", async () => {
  const { authClient, published, useCase } = createUseCase();
  authClient.loginImpl = async () => {
    throw new Error("login failed");
  };

  await useCase.link(SESSION_PLATFORMS.TWITCH);
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.deepEqual(published, [
    {
      provider: SESSION_PLATFORMS.TWITCH,
      state: ACCOUNT_LINK_STATES.LINKING,
    },
    {
      provider: SESSION_PLATFORMS.TWITCH,
      state: ACCOUNT_LINK_STATES.FAILED,
      reason: "login failed",
    },
  ]);
});

test("linking 中の二重 link は login を増やさず現在状態を返す", async () => {
  const { authClient, published, useCase } = createUseCase();
  let resolveLogin: (() => void) | undefined;
  authClient.loginImpl = async () => {
    await new Promise<void>((resolve) => {
      resolveLogin = resolve;
    });
  };

  const first = await useCase.link(SESSION_PLATFORMS.YOUTUBE);
  const second = await useCase.link(SESSION_PLATFORMS.YOUTUBE);
  resolveLogin?.();
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.deepEqual(first, second);
  assert.deepEqual(authClient.loginCalls, [SESSION_PLATFORMS.YOUTUBE]);
  assert.equal(
    published.filter(
      (event) =>
        event.provider === SESSION_PLATFORMS.YOUTUBE &&
        event.state === ACCOUNT_LINK_STATES.LINKING,
    ).length,
    1,
  );
});

test("unlink は auth.logout 後に unlinked を publish する", async () => {
  const { authClient, published, useCase } = createUseCase();
  await useCase.initialize();
  authClient.linkStatuses.set(SESSION_PLATFORMS.YOUTUBE, {
    provider: SESSION_PLATFORMS.YOUTUBE,
    state: "linked",
  });
  await useCase.initialize();

  const result = await useCase.unlink(SESSION_PLATFORMS.YOUTUBE);

  assert.deepEqual(result, {
    provider: SESSION_PLATFORMS.YOUTUBE,
    state: ACCOUNT_LINK_STATES.UNLINKED,
  });
  assert.deepEqual(authClient.logoutCalls, [SESSION_PLATFORMS.YOUTUBE]);
  assert.deepEqual(published, [
    {
      provider: SESSION_PLATFORMS.YOUTUBE,
      state: ACCOUNT_LINK_STATES.UNLINKED,
    },
  ]);
});

test("markAsUnlinked は reason 付き unlinked を publish する", async () => {
  const { published, useCase } = createUseCase();

  const result = await useCase.markAsUnlinked(
    SESSION_PLATFORMS.TWITCH,
    "再ログインが必要です",
  );

  assert.deepEqual(result, {
    provider: SESSION_PLATFORMS.TWITCH,
    state: ACCOUNT_LINK_STATES.UNLINKED,
    reason: "再ログインが必要です",
  });
  assert.deepEqual(published, [
    {
      provider: SESSION_PLATFORMS.TWITCH,
      state: ACCOUNT_LINK_STATES.UNLINKED,
      reason: "再ログインが必要です",
    },
  ]);
});

test("getSnapshot は provider ごとの現在状態を返す", async () => {
  const { useCase } = createUseCase();
  await useCase.markAsUnlinked(SESSION_PLATFORMS.YOUTUBE, "expired");

  const snapshot: Record<AccountLinkProvider, AccountStateOutputEvent> =
    useCase.getSnapshot();

  assert.deepEqual(snapshot[SESSION_PLATFORMS.YOUTUBE], {
    provider: SESSION_PLATFORMS.YOUTUBE,
    state: ACCOUNT_LINK_STATES.UNLINKED,
    reason: "expired",
  });
  assert.deepEqual(snapshot[SESSION_PLATFORMS.TWITCH], {
    provider: SESSION_PLATFORMS.TWITCH,
    state: ACCOUNT_LINK_STATES.UNLINKED,
  });
});
