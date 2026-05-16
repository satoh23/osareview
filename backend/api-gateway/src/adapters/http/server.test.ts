import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import {
  SESSION_PLATFORMS,
  SESSION_STATES,
  type SessionPlatform,
} from "@comment-dock/shared";
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
  const server = new HttpControlServer(useCase);
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
      /Unsupported session platform/,
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
    assert.deepEqual(body, { error: "Not Found" });
  } finally {
    await fixture.server.close();
  }
});
