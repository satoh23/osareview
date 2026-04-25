import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { YouTubeApiClient } from "./api.client.js";

test("accessToken が無い場合はエラーを投げる", async () => {
  const client = new YouTubeApiClient(
    {
      async getAccessToken() {
        return "";
      },
    },
    async () => new Response() as never,
  );

  await assert.rejects(
    () => client.fetchLiveChatMessages({ liveChatId: "chat-id" }),
    /YouTube access token is missing from AccessTokenProvider/,
  );
});

test("liveChatMessages.list を正しいクエリとヘッダで呼ぶ", async () => {
  let capturedUrl = "";
  let capturedAuthHeader = "";

  const httpClient: typeof fetch = async (input, init) => {
    capturedUrl = String(input);
    capturedAuthHeader = String(
      (init?.headers as Record<string, string>).Authorization,
    );
    return new Response(
      JSON.stringify({
        kind: "youtube#liveChatMessageListResponse",
        etag: "etag",
        items: [],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const client = new YouTubeApiClient(
    {
      async getAccessToken() {
        return "test-token";
      },
    },
    httpClient,
  );

  await client.fetchLiveChatMessages({
    liveChatId: "live-chat-id",
    pageToken: "next-page",
  });

  assert.match(capturedUrl, /\/liveChatMessages\?/);
  assert.match(capturedUrl, /part=id%2Csnippet%2CauthorDetails/);
  assert.match(capturedUrl, /liveChatId=live-chat-id/);
  assert.match(capturedUrl, /maxResults=2000/);
  assert.match(capturedUrl, /pageToken=next-page/);
  assert.equal(capturedAuthHeader, "Bearer test-token");
});

test("APIエラー時はステータスと本文を含むエラーを投げる", async () => {
  const httpClient: typeof fetch = async () =>
    new Response(JSON.stringify({ error: { message: "forbidden" } }), {
      status: 403,
      statusText: "Forbidden",
      headers: { "Content-Type": "application/json" },
    });

  const client = new YouTubeApiClient(
    {
      async getAccessToken() {
        return "test-token";
      },
    },
    httpClient,
  );

  await assert.rejects(
    () => client.fetchLiveChatMessages({ liveChatId: "chat-id" }),
    /YouTube API request failed: 403 Forbidden/,
  );
});
