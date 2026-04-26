import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { YouTubeLiveStreamClient } from "./live-stream.client.js";

test("アクセストークンが無い場合はエラーを投げる", async () => {
  const client = new YouTubeLiveStreamClient(
    {
      async getAccessToken() {
        return "";
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
    () => client.detectLiveStream({ channelId: "channel-1" }),
    /YouTube access token is missing from AccessTokenProvider/,
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
    {
      async getAccessToken() {
        return "test-token";
      },
    },
    httpClient,
    {
      getDataApiBaseUrl() {
        return "https://www.googleapis.com/youtube/v3";
      },
    },
  );

  const result = await client.detectLiveStream({ channelId: "channel-1" });
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
    {
      async getAccessToken() {
        return "test-token";
      },
    },
    httpClient,
    {
      getDataApiBaseUrl() {
        return "https://www.googleapis.com/youtube/v3";
      },
    },
  );

  const result = await client.detectLiveStream({ channelId: "channel-1" });
  assert.equal(result, null);
});
