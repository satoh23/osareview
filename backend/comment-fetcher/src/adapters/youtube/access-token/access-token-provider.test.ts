import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import type { AuthClient, Provider } from "@comment-dock/auth";
import { YouTubeAccessTokenProvider } from "./access-token-provider.js";

test("YouTube の認証付き HTTP 呼び出しは authClient.withAuthorizedRequest に委譲する", async () => {
  const calls: Provider[] = [];
  const provider = new YouTubeAccessTokenProvider({
    async withAuthorizedRequest<T>(
      providerName: Provider,
      request: (accessToken: string) => Promise<T>,
    ): Promise<T> {
      calls.push(providerName);
      return request("youtube-token");
    },
  } as AuthClient);

  const result = await provider.request((accessToken) =>
    Promise.resolve(`Bearer ${accessToken}`),
  );

  assert.equal(result, "Bearer youtube-token");
  assert.deepEqual(calls, ["youtube"]);
});

test("YouTube の長期接続用 accessor は authClient.createAuthorizedTokenAccessor に委譲する", async () => {
  const calls: Provider[] = [];
  const provider = new YouTubeAccessTokenProvider({
    createAuthorizedTokenAccessor(providerName: Provider) {
      calls.push(providerName);
      return {
        async getCurrentAccessToken() {
          return "youtube-current-token";
        },
        async refresh() {
          return "youtube-refreshed-token";
        },
      };
    },
  } as AuthClient);

  const accessor = provider.createAuthorizedTokenAccessor();

  assert.equal(await accessor.getCurrentAccessToken(), "youtube-current-token");
  assert.equal(await accessor.refresh(), "youtube-refreshed-token");
  assert.deepEqual(calls, ["youtube"]);
});
