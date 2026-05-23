import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import type { AuthClient, AuthorizationLostListener } from "@comment-dock/auth";
import type { DeliverCommentsUseCase } from "@comment-dock/comment-delivery";
import { HttpControlServer } from "../adapters/http/server.js";
import type { ManageStreamingSessionsUseCase } from "../usecases/manage-streaming-sessions.usecase.js";
import type { ManageAccountLinksUseCase } from "../usecases/manage-account-links.usecase.js";
import { runApiGateway } from "./main.js";

test("起動時に account link を初期化し、認可喪失通知を購読する", async () => {
  const calls: string[] = [];
  const signalHandlers: Partial<Record<NodeJS.Signals, () => void>> = {};
  let authorizationLostListener: AuthorizationLostListener | undefined;

  const authClient = {
    onAuthorizationLost(listener: AuthorizationLostListener): () => void {
      calls.push("auth:onAuthorizationLost");
      authorizationLostListener = listener;
      return () => {
        calls.push("auth:unsubscribeAuthorizationLost");
      };
    },
  } as unknown as AuthClient;

  await runApiGateway({
    authClient,
    httpControlServer: {
      async start() {
        calls.push("http:start");
      },
      async close() {
        calls.push("http:close");
      },
    },
    manageAccountLinksUseCase: {
      async initialize() {
        calls.push("account:initialize");
      },
      getSnapshot() {
        calls.push("account:getSnapshot");
        return {
          youtube: {
            provider: "youtube",
            state: "linked",
          },
          twitch: {
            provider: "twitch",
            state: "unlinked",
          },
        };
      },
      async markAsUnlinked(provider, reason) {
        calls.push(`account:markAsUnlinked:${provider}:${reason ?? ""}`);
        return {
          provider,
          state: "unlinked",
          ...(reason ? { reason } : {}),
        };
      },
    },
    onSignal(signal, handler) {
      calls.push(`signal:on:${signal}`);
      signalHandlers[signal] = handler;
    },
    webSocketCommentOutputPort: {
      async publishAccountState(account) {
        calls.push(
          `ws:publishAccountState:${account.provider}:${account.state}`,
        );
      },
      async start() {
        calls.push("ws:start");
      },
      async close() {
        calls.push("ws:close");
      },
    },
  });

  assert.deepEqual(calls, [
    "account:initialize",
    "account:getSnapshot",
    "ws:publishAccountState:youtube:linked",
    "ws:publishAccountState:twitch:unlinked",
    "auth:onAuthorizationLost",
    "ws:start",
    "http:start",
    "signal:on:SIGINT",
    "signal:on:SIGTERM",
  ]);

  authorizationLostListener?.({
    provider: "youtube",
    reason: "expired",
    occurredAt: 1_700_000_000_000,
  });
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(calls.at(-1), "account:markAsUnlinked:youtube:expired");

  signalHandlers.SIGINT?.();
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.deepEqual(calls.slice(-3), [
    "auth:unsubscribeAuthorizationLost",
    "http:close",
    "ws:close",
  ]);
});

const buildHttpControlServerMocks = () => ({
  manageStreamingSessionsUseCase: {
    getSessions: () => ({}),
    start: async () => ({}),
    stop: async () => ({}),
  } as unknown as ManageStreamingSessionsUseCase,
  manageAccountLinksUseCase: {
    initialize: async () => {},
    getSnapshot: () => ({}),
    link: async () => ({}),
    unlink: async () => ({}),
    markAsUnlinked: async () => ({}),
  } as unknown as ManageAccountLinksUseCase,
  deliverCommentsUseCase: {
    deliverComments: async () => {},
  } as unknown as DeliverCommentsUseCase,
});

test("HttpControlServer: API_GATEWAY_ENABLE_TEST_INJECT=true のとき POST /test/comments が 200 を返す", async () => {
  process.env.API_GATEWAY_ENABLE_TEST_INJECT = "true";
  const {
    manageStreamingSessionsUseCase,
    manageAccountLinksUseCase,
    deliverCommentsUseCase,
  } = buildHttpControlServerMocks();
  const server = new HttpControlServer(
    manageStreamingSessionsUseCase,
    manageAccountLinksUseCase,
    deliverCommentsUseCase,
  );

  await server.start({ host: "127.0.0.1", port: 17397 });
  try {
    const response = await fetch("http://127.0.0.1:17397/test/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments: [] }),
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body, { accepted: 0 });
  } finally {
    await server.close();
    delete process.env.API_GATEWAY_ENABLE_TEST_INJECT;
  }
});

test("HttpControlServer: API_GATEWAY_ENABLE_TEST_INJECT が未設定のとき POST /test/comments が 404 を返す", async () => {
  delete process.env.API_GATEWAY_ENABLE_TEST_INJECT;
  const {
    manageStreamingSessionsUseCase,
    manageAccountLinksUseCase,
    deliverCommentsUseCase,
  } = buildHttpControlServerMocks();
  const server = new HttpControlServer(
    manageStreamingSessionsUseCase,
    manageAccountLinksUseCase,
    deliverCommentsUseCase,
  );

  await server.start({ host: "127.0.0.1", port: 17396 });
  try {
    const response = await fetch("http://127.0.0.1:17396/test/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comments: [] }),
    });
    assert.equal(response.status, 404);
  } finally {
    await server.close();
  }
});
