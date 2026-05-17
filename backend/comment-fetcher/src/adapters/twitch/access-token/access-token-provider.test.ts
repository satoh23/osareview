import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import type { AuthClient, Provider } from "@comment-dock/auth";
import { TwitchAccessTokenProvider } from "./access-token-provider.js";

test("Twitch の認証付き HTTP 呼び出しは authClient.withAuthorizedRequest に委譲する", async () => {
  const calls: Provider[] = [];
  const provider = new TwitchAccessTokenProvider({
    async withAuthorizedRequest<T>(
      providerName: Provider,
      request: (accessToken: string) => Promise<T>,
    ): Promise<T> {
      calls.push(providerName);
      return request("twitch-token");
    },
  } as AuthClient);

  const result = await provider.request((accessToken) =>
    Promise.resolve(`Bearer ${accessToken}`),
  );

  assert.equal(result, "Bearer twitch-token");
  assert.deepEqual(calls, ["twitch"]);
});

test("Twitch の長期接続用 accessor は authClient.createAuthorizedTokenAccessor に委譲する", async () => {
  const calls: Provider[] = [];
  const provider = new TwitchAccessTokenProvider({
    createAuthorizedTokenAccessor(providerName: Provider) {
      calls.push(providerName);
      return {
        async getCurrentAccessToken() {
          return "twitch-current-token";
        },
        async refresh() {
          return "twitch-refreshed-token";
        },
      };
    },
  } as AuthClient);

  const accessor = provider.createAuthorizedTokenAccessor();

  assert.equal(await accessor.getCurrentAccessToken(), "twitch-current-token");
  assert.equal(await accessor.refresh(), "twitch-refreshed-token");
  assert.deepEqual(calls, ["twitch"]);
});
