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

test("streams APIから配信中stream idを返す", async () => {
  const calledUrls: string[] = [];
  const httpClient: typeof fetch = async (input) => {
    calledUrls.push(String(input));
    return new Response(
      JSON.stringify({
        data: [{ id: "40952121085", user_id: "141981764" }],
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

  const stream = await client.findActiveStream("141981764");
  assert.deepEqual(stream, { streamId: "40952121085" });
  assert.equal(calledUrls.length, 1);
  assert.match(calledUrls[0] ?? "", /\/streams\?user_id=141981764/);
});

test("streams APIが空配列ならnullを返す", async () => {
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

  const stream = await client.findActiveStream("141981764");
  assert.equal(stream, null);
});

test("EventSub subscription を作成できる", async () => {
  const called: Array<{
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }> = [];

  const httpClient: typeof fetch = async (input, init) => {
    called.push({
      url: String(input),
      method: init?.method,
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body as string | undefined,
    });
    return new Response(
      JSON.stringify({
        data: [
          {
            id: "sub-1",
            status: "enabled",
            type: "channel.chat.message",
            version: "1",
          },
        ],
      }),
      { status: 202, headers: { "Content-Type": "application/json" } },
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

  await client.createEventSubSubscription({
    type: "channel.chat.message",
    version: "1",
    condition: {
      broadcaster_user_id: "141981764",
      user_id: "2914196",
    },
    sessionId: "session-1",
  });

  assert.equal(called.length, 1);
  assert.match(called[0]?.url ?? "", /\/eventsub\/subscriptions$/);
  assert.equal(called[0]?.method, "POST");
  assert.equal(called[0]?.headers?.Authorization, "Bearer test-token");
  assert.equal(called[0]?.headers?.["Client-Id"], "test-client-id");
  assert.equal(called[0]?.headers?.["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(called[0]?.body ?? "{}"), {
    type: "channel.chat.message",
    version: "1",
    condition: {
      broadcaster_user_id: "141981764",
      user_id: "2914196",
    },
    transport: {
      method: "websocket",
      session_id: "session-1",
    },
  });
});
