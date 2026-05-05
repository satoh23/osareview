import test from "node:test";
import assert from "node:assert/strict";
import { TwitchDeviceCodeOAuthClient } from "./device-code-oauth.client.js";

class StubConfigProvider {
  getOAuthConfig() {
    return {
      clientId: "twitch-client-1",
      deviceAuthorizationEndpoint: "https://id.example.com/oauth2/device",
      tokenEndpoint: "https://id.example.com/oauth2/token",
    };
  }
}

test("requestDeviceAuthorization: device_code 取得レスポンスを整形する", async () => {
  let calledUrl = "";
  let calledBody = "";
  const client = new TwitchDeviceCodeOAuthClient(new StubConfigProvider(), {
    fetchFn: async (input, init) => {
      calledUrl = String(input);
      calledBody = String(init?.body);
      return new Response(
        JSON.stringify({
          device_code: "device-code-1",
          user_code: "ABCD1234",
          verification_uri:
            "https://www.twitch.tv/activate?public=true&device-code=ABCD1234",
          expires_in: 1800,
          interval: 5,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
    nowFn: () => 1_000_000,
  });

  const result = await client.requestDeviceAuthorization(["user:read:chat"]);
  assert.equal(calledUrl, "https://id.example.com/oauth2/device");
  assert.match(calledBody, /client_id=twitch-client-1/);
  assert.match(calledBody, /scopes=user%3Aread%3Achat/);
  assert.equal(result.deviceCode, "device-code-1");
  assert.equal(result.userCode, "ABCD1234");
  assert.equal(
    result.verificationUri.toString(),
    "https://www.twitch.tv/activate?public=true&device-code=ABCD1234",
  );
  assert.equal(result.intervalSeconds, 5);
  assert.equal(result.expiresAtMs, 1_000_000 + 1_800_000);
});

test("pollingForToken: authorization_pending をまたいで成功レスポンスを返す", async () => {
  const responses = [
    new Response(
      JSON.stringify({ status: 400, message: "authorization_pending" }),
      { status: 400, headers: { "content-type": "application/json" } },
    ),
    new Response(
      JSON.stringify({
        access_token: "access-2",
        refresh_token: "refresh-2",
        expires_in: 3600,
        scope: ["user:read:chat"],
        token_type: "bearer",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  ];
  let callCount = 0;
  const sleptMs: number[] = [];

  const client = new TwitchDeviceCodeOAuthClient(new StubConfigProvider(), {
    fetchFn: async () => responses[callCount++] as Response,
    sleepMsFn: async (ms) => {
      sleptMs.push(ms);
    },
    nowFn: () => 1_000_000,
  });

  const tokenSet = await client.pollingForToken({
    deviceCode: "device-1",
    intervalSeconds: 2,
    expiresAtMs: 2_000_000,
  });

  assert.equal(callCount, 2);
  assert.deepEqual(sleptMs, [2000, 2000]);
  assert.equal(tokenSet.accessToken, "access-2");
  assert.equal(tokenSet.refreshToken, "refresh-2");
  assert.equal(tokenSet.scope, "user:read:chat");
});

test("pollingForToken: expiresAtMs 超過でエラー", async () => {
  const client = new TwitchDeviceCodeOAuthClient(new StubConfigProvider(), {
    fetchFn: async () => {
      throw new Error("fetch should not be called");
    },
    nowFn: () => 2_000_000,
  });

  await assert.rejects(
    client.pollingForToken({
      deviceCode: "device-1",
      intervalSeconds: 2,
      expiresAtMs: 1_000_000,
    }),
    (err: unknown) =>
      err instanceof Error && err.message.includes("authorization expired"),
  );
});

test("refresh: refresh_token がレスポンスになければ入力値を引き継ぐ", async () => {
  let calledBody = "";
  const client = new TwitchDeviceCodeOAuthClient(new StubConfigProvider(), {
    fetchFn: async (_input, init) => {
      calledBody = String(init?.body);
      return new Response(
        JSON.stringify({
          access_token: "access-3",
          expires_in: 1200,
          scope: ["user:read:chat"],
          token_type: "bearer",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });

  const tokenSet = await client.refresh({ refreshToken: "refresh-original" });
  assert.match(calledBody, /grant_type=refresh_token/);
  assert.match(calledBody, /client_id=twitch-client-1/);
  assert.match(calledBody, /refresh_token=refresh-original/);
  assert.equal(tokenSet.refreshToken, "refresh-original");
  assert.equal(tokenSet.accessToken, "access-3");
});
