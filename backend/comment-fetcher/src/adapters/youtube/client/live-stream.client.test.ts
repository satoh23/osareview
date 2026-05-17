import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { UnauthorizedRequestError } from "@comment-dock/auth";
import { YouTubeLiveStreamClient } from "./live-stream.client.js";

const authorizedHttpClient = (accessToken: string) => ({
  async request<T>(request: (token: string) => Promise<T>): Promise<T> {
    return request(accessToken);
  },
});

test("認可境界でアクセストークン取得に失敗した場合はエラーを伝播する", async () => {
  const client = new YouTubeLiveStreamClient(
    {
      async request() {
        throw new Error("YouTube authorization failed.");
      },
    },
    async () => new Response() as never,
    {
      getDataApiBaseUrl() {
        return "https://www.googleapis.com/youtube/v3";
      },
    },
  );

  await assert.rejects(
    () => client.findLiveStream({ channelId: "channel-1" }),
    /YouTube authorization failed/,
  );
});

test("配信中なら配信IDとライブチャットIDを返す", async () => {
  const calledUrls: string[] = [];
  const httpClient: typeof fetch = async (input) => {
    const url = String(input);
    calledUrls.push(url);

    if (url.includes("/search?")) {
      return new Response(
        JSON.stringify({
          items: [{ id: { videoId: "live-video-1" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        items: [
          {
            id: "live-video-1",
            liveStreamingDetails: { activeLiveChatId: "chat-1" },
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const client = new YouTubeLiveStreamClient(
    authorizedHttpClient("test-token"),
    httpClient,
    {
      getDataApiBaseUrl() {
        return "https://www.googleapis.com/youtube/v3";
      },
    },
  );

  const result = await client.findLiveStream({ channelId: "channel-1" });
  assert.deepEqual(result, {
    liveStreamId: "live-video-1",
    liveChatId: "chat-1",
  });
  assert.equal(calledUrls.length, 2);
  assert.match(calledUrls[0] ?? "", /\/search\?/);
  assert.match(calledUrls[1] ?? "", /\/videos\?/);
});

test("配信が見つからない場合は null を返す", async () => {
  const httpClient: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        items: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const client = new YouTubeLiveStreamClient(
    authorizedHttpClient("test-token"),
    httpClient,
    {
      getDataApiBaseUrl() {
        return "https://www.googleapis.com/youtube/v3";
      },
    },
  );

  const result = await client.findLiveStream({ channelId: "channel-1" });
  assert.equal(result, null);
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
        items: [{ id: "channel-1" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const client = new YouTubeLiveStreamClient(
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
      getDataApiBaseUrl() {
        return "https://www.googleapis.com/youtube/v3";
      },
    },
  );

  const result = await client.resolveOwnChannelId();
  assert.equal(result, "channel-1");
  assert.deepEqual(calledTokens, [
    "Bearer expired-token",
    "Bearer refreshed-token",
  ]);
});
