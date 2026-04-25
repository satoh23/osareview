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
    {
      getDataApiBaseUrl() {
        return "https://www.googleapis.com/youtube/v3";
      },
    },
  );

  await assert.rejects(
    () => client.fetchLiveChatMessages({ liveChatId: "chat-id" }),
    /YouTube access token is missing from AccessTokenProvider/,
  );
});

test.skip("streamList接続の正常系テスト（後でgRPCモック化）", async () => {
  const client = new YouTubeApiClient(
    {
      async getAccessToken() {
        return "test-token";
      },
    },
    {
      getDataApiBaseUrl() {
        return "https://www.googleapis.com/youtube/v3";
      },
    },
  );

  await client.fetchLiveChatMessages({
    liveChatId: "live-chat-id",
    pageToken: "next-page",
  });

  assert.ok(client);
});

test.skip("streamList接続のエラー系テスト（後でgRPCモック化）", async () => {
  const client = new YouTubeApiClient(
    {
      async getAccessToken() {
        return "test-token";
      },
    },
    {
      getDataApiBaseUrl() {
        return "https://www.googleapis.com/youtube/v3";
      },
    },
  );

  assert.ok(client);
});
