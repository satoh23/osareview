import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { TwitchHelixClient } from "./helix.client.js";

test("アクセストークンが無い場合はエラーを投げる", async () => {
  const client = new TwitchHelixClient(
    {
      async getAccessToken() {
        return "";
      },
    },
    async () => new Response() as never,
    {
      getHelixApiBaseUrl() {
        return "https://api.twitch.tv/helix";
      },
      getEventSubWebSocketUrl() {
        return "wss://eventsub.wss.twitch.tv/ws";
      },
      getClientId() {
        return "client-id";
      },
    },
  );

  await assert.rejects(
    () => client.resolveUserIdByLogin("twitchdev"),
    /Twitch access token is missing from AccessTokenProvider/,
  );
});

test("クライアントIDが無い場合はエラーを投げる", async () => {
  const client = new TwitchHelixClient(
    {
      async getAccessToken() {
        return "token";
      },
    },
    async () => new Response() as never,
    {
      getHelixApiBaseUrl() {
        return "https://api.twitch.tv/helix";
      },
      getEventSubWebSocketUrl() {
        return "wss://eventsub.wss.twitch.tv/ws";
      },
      getClientId() {
        return "";
      },
    },
  );

  await assert.rejects(
    () => client.resolveUserIdByLogin("twitchdev"),
    /Twitch client ID is missing from TwitchConfigProvider/,
  );
});

test("users APIからuser idを解決して返す", async () => {
  const calledUrls: string[] = [];
  const calledHeaders: Array<Record<string, string>> = [];

  const httpClient: typeof fetch = async (input, init) => {
    calledUrls.push(String(input));
    calledHeaders.push((init?.headers ?? {}) as Record<string, string>);
    return new Response(
      JSON.stringify({
        data: [
          { id: "141981764", login: "twitchdev", display_name: "TwitchDev" },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const client = new TwitchHelixClient(
    {
      async getAccessToken() {
        return "test-token";
      },
    },
    httpClient,
    {
      getHelixApiBaseUrl() {
        return "https://api.twitch.tv/helix";
      },
      getEventSubWebSocketUrl() {
        return "wss://eventsub.wss.twitch.tv/ws";
      },
      getClientId() {
        return "test-client-id";
      },
    },
  );

  const userId = await client.resolveUserIdByLogin("twitchdev");
  assert.equal(userId, "141981764");
  assert.equal(calledUrls.length, 1);
  assert.match(calledUrls[0] ?? "", /\/users\?login=twitchdev/);
  assert.equal(calledHeaders[0]?.Authorization, "Bearer test-token");
  assert.equal(calledHeaders[0]?.["Client-Id"], "test-client-id");
});

test("users APIが空配列ならnullを返す", async () => {
  const client = new TwitchHelixClient(
    {
      async getAccessToken() {
        return "test-token";
      },
    },
    async () =>
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    {
      getHelixApiBaseUrl() {
        return "https://api.twitch.tv/helix";
      },
      getEventSubWebSocketUrl() {
        return "wss://eventsub.wss.twitch.tv/ws";
      },
      getClientId() {
        return "test-client-id";
      },
    },
  );

  const userId = await client.resolveUserIdByLogin("unknown_user");
  assert.equal(userId, null);
});
