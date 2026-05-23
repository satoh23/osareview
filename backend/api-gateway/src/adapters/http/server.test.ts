import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import {
  ACCOUNT_LINK_STATES,
  SESSION_PLATFORMS,
  SESSION_STATES,
  type AccountLinkProvider,
  type SessionPlatform,
} from "@comment-dock/shared";
import type { ManageAccountLinksUseCase } from "../../usecases/manage-account-links.usecase.js";
import type { ManageStreamingSessionsUseCase } from "../../usecases/manage-streaming-sessions.usecase.js";
import { HttpControlServer } from "./server.js";

const reservePort = async (): Promise<number> => {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.once("error", reject);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("failed to reserve port");
  }
  const port = address.port;
  await new Promise<void>((resolve, reject) => {
    server.close((error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  return port;
};

type ControlServerFixture = {
  server: HttpControlServer;
  baseUrl: string;
  calls: string[];
};

const createFixture = async (): Promise<ControlServerFixture> => {
  const calls: string[] = [];
  const accounts = {
    [SESSION_PLATFORMS.YOUTUBE]: {
      provider: SESSION_PLATFORMS.YOUTUBE,
      state: ACCOUNT_LINK_STATES.UNLINKED,
    },
    [SESSION_PLATFORMS.TWITCH]: {
      provider: SESSION_PLATFORMS.TWITCH,
      state: ACCOUNT_LINK_STATES.LINKED,
    },
  };
  const sessions = {
    [SESSION_PLATFORMS.YOUTUBE]: {
      platform: SESSION_PLATFORMS.YOUTUBE,
      state: SESSION_STATES.IDLE,
    },
    [SESSION_PLATFORMS.TWITCH]: {
      platform: SESSION_PLATFORMS.TWITCH,
      state: SESSION_STATES.CONNECTED,
    },
  };
  const useCase = {
    getSessions() {
      calls.push("getSessions");
      return sessions;
    },
    async start(platform: SessionPlatform) {
      calls.push(`start:${platform}`);
      return {
        platform,
        state: SESSION_STATES.CONNECTING,
      };
    },
    async stop(platform: SessionPlatform) {
      calls.push(`stop:${platform}`);
      return {
        platform,
        state: SESSION_STATES.IDLE,
      };
    },
  } as unknown as ManageStreamingSessionsUseCase;
  const manageAccountLinksUseCase = {
    getSnapshot() {
      calls.push("getAccounts");
      return accounts;
    },
    async link(provider: AccountLinkProvider) {
      calls.push(`link:${provider}`);
      return {
        provider,
        state: ACCOUNT_LINK_STATES.LINKING,
      };
    },
    async unlink(provider: AccountLinkProvider) {
      calls.push(`unlink:${provider}`);
      return {
        provider,
        state: ACCOUNT_LINK_STATES.UNLINKED,
      };
    },
  } as unknown as ManageAccountLinksUseCase;
  const server = new HttpControlServer(useCase, manageAccountLinksUseCase);
  const port = await reservePort();

  await server.start({ host: "127.0.0.1", port });

  return {
    server,
    baseUrl: `http://127.0.0.1:${port}`,
    calls,
  };
};

test("GET /sessions は現在のセッション一覧を返す", async () => {
  const fixture = await createFixture();
  try {
    const response = await fetch(`${fixture.baseUrl}/sessions`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      sessions: {
        youtube: {
          platform: "youtube",
          state: "idle",
        },
        twitch: {
          platform: "twitch",
          state: "connected",
        },
      },
    });
    assert.deepEqual(fixture.calls, ["getSessions"]);
  } finally {
    await fixture.server.close();
  }
});

test("POST /sessions/:platform/start は対象セッションを開始する", async () => {
  const fixture = await createFixture();
  try {
    const response = await fetch(`${fixture.baseUrl}/sessions/youtube/start`, {
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      session: {
        platform: "youtube",
        state: "connecting",
      },
    });
    assert.deepEqual(fixture.calls, ["start:youtube"]);
  } finally {
    await fixture.server.close();
  }
});

test("POST /sessions/:platform/stop は対象セッションを停止する", async () => {
  const fixture = await createFixture();
  try {
    const response = await fetch(`${fixture.baseUrl}/sessions/twitch/stop`, {
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      session: {
        platform: "twitch",
        state: "idle",
      },
    });
    assert.deepEqual(fixture.calls, ["stop:twitch"]);
  } finally {
    await fixture.server.close();
  }
});

test("GET /accounts は現在のアカウント連携状態一覧を返す", async () => {
  const fixture = await createFixture();
  try {
    const response = await fetch(`${fixture.baseUrl}/accounts`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      accounts: {
        youtube: {
          provider: "youtube",
          state: "unlinked",
        },
        twitch: {
          provider: "twitch",
          state: "linked",
        },
      },
    });
    assert.deepEqual(fixture.calls, ["getAccounts"]);
  } finally {
    await fixture.server.close();
  }
});

test("POST /accounts/:provider/link は対象アカウント連携を開始する", async () => {
  const fixture = await createFixture();
  try {
    const response = await fetch(`${fixture.baseUrl}/accounts/youtube/link`, {
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      account: {
        provider: "youtube",
        state: "linking",
      },
    });
    assert.deepEqual(fixture.calls, ["link:youtube"]);
  } finally {
    await fixture.server.close();
  }
});

test("POST /accounts/:provider/unlink は対象アカウント連携を解除する", async () => {
  const fixture = await createFixture();
  try {
    const response = await fetch(`${fixture.baseUrl}/accounts/twitch/unlink`, {
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, {
      account: {
        provider: "twitch",
        state: "unlinked",
      },
    });
    assert.deepEqual(fixture.calls, ["unlink:twitch"]);
  } finally {
    await fixture.server.close();
  }
});

test("未対応 platform は 400 を返す", async () => {
  const fixture = await createFixture();
  try {
    const response = await fetch(`${fixture.baseUrl}/sessions/unknown/start`, {
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(
      String((body as { error?: unknown }).error),
      /対応していないコメント接続先です/,
    );
    assert.deepEqual(fixture.calls, []);
  } finally {
    await fixture.server.close();
  }
});

test("未対応 account provider は 400 を返す", async () => {
  const fixture = await createFixture();
  try {
    const response = await fetch(`${fixture.baseUrl}/accounts/unknown/link`, {
      method: "POST",
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.match(
      String((body as { error?: unknown }).error),
      /対応していないアカウント連携先です/,
    );
    assert.deepEqual(fixture.calls, []);
  } finally {
    await fixture.server.close();
  }
});

test("未定義 route は 404 を返す", async () => {
  const fixture = await createFixture();
  try {
    const response = await fetch(`${fixture.baseUrl}/auth/youtube/login`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(body, { error: "指定された API が見つかりません。" });
  } finally {
    await fixture.server.close();
  }
});
