import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { UnauthorizedRequestError } from "@comment-dock/auth";
import { TwitchHelixClient } from "./helix.client.js";

const authorizedHttpClient = (accessToken: string) => ({
  async request<T>(request: (token: string) => Promise<T>): Promise<T> {
    return request(accessToken);
  },
});

test("認可境界でアクセストークン取得に失敗した場合はエラーを伝播する", async () => {
  const client = new TwitchHelixClient(
    {
      async request() {
        throw new Error("Twitch authorization failed.");
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
    /Twitch authorization failed/,
  );
});

test("クライアントIDが無い場合はエラーを投げる", async () => {
  const client = new TwitchHelixClient(
    authorizedHttpClient("token"),
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
    authorizedHttpClient("test-token"),
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
    authorizedHttpClient("test-token"),
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

test("401 応答は UnauthorizedRequestError として投げ、認可境界で再実行できる", async () => {
  const calledTokens: string[] = [];
  const httpClient: typeof fetch = async (_input, init) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calledTokens.push(headers.Authorization);
    if (calledTokens.length === 1) {
      return new Response("expired", {
        status: 401,
        statusText: "Unauthorized",
      });
    }

    return new Response(
      JSON.stringify({
        data: [{ id: "141981764", login: "twitchdev" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const client = new TwitchHelixClient(
    {
      async request<T>(request: (token: string) => Promise<T>): Promise<T> {
        try {
          return await request("expired-token");
        } catch (error) {
          if (error instanceof UnauthorizedRequestError) {
            return request("refreshed-token");
          }
          throw error;
        }
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
  assert.deepEqual(calledTokens, [
    "Bearer expired-token",
    "Bearer refreshed-token",
  ]);
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
    authorizedHttpClient("test-token"),
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
    authorizedHttpClient("test-token"),
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
    authorizedHttpClient("test-token"),
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

test("self user id を取得できる", async () => {
  const calledUrls: string[] = [];
  const httpClient: typeof fetch = async (input) => {
    calledUrls.push(String(input));
    return new Response(
      JSON.stringify({
        data: [{ id: "2914196", login: "bot_user", display_name: "BotUser" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const client = new TwitchHelixClient(
    authorizedHttpClient("test-token"),
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

  const selfUserId = await client.getSelfUserId();
  assert.equal(selfUserId, "2914196");
  assert.equal(calledUrls.length, 1);
  assert.match(calledUrls[0] ?? "", /\/users$/);
});

test("self user id は2回目以降キャッシュを返す", async () => {
  let callCount = 0;
  const httpClient: typeof fetch = async () => {
    callCount += 1;
    return new Response(
      JSON.stringify({
        data: [{ id: "2914196", login: "bot_user", display_name: "BotUser" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const client = new TwitchHelixClient(
    authorizedHttpClient("test-token"),
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

  const first = await client.getSelfUserId();
  const second = await client.getSelfUserId();
  assert.equal(first, "2914196");
  assert.equal(second, "2914196");
  assert.equal(callCount, 1);
});

test("self user が取得できない場合はエラーを投げる", async () => {
  const client = new TwitchHelixClient(
    authorizedHttpClient("test-token"),
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

  await assert.rejects(
    () => client.getSelfUserId(),
    /Twitch self user was not found from \/helix\/users/,
  );
});
