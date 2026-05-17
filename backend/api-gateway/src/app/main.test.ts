import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import type { AuthClient, AuthorizationLostListener } from "@comment-dock/auth";
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
