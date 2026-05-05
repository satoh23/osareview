import test from "node:test";
import assert from "node:assert/strict";
import { YouTubeOAuthClient } from "./oauth.client.js";
import type { YouTubeOAuthConfigProvider } from "../../../infrastructure/youtube/config/oauth-config.js";

class StubConfigProvider implements YouTubeOAuthConfigProvider {
  getOAuthConfig() {
    return {
      clientId: "client-id-1",
      authorizationEndpoint: "https://accounts.example.com/auth",
      tokenEndpoint: "https://accounts.example.com/token",
      scopes: ["scope.default"],
    };
  }
}

test("authorize: YouTube OAuth URL を組み立てる", () => {
  const client = new YouTubeOAuthClient(new StubConfigProvider());
  const url = client.authorize({
    redirectUri: "http://127.0.0.1:3000/callback",
    state: "state1",
    codeVerifier: "verifier",
    codeChallenge: "challenge",
    scopes: ["scope.a", "scope.b"],
  });
  assert.equal(url.origin + url.pathname, "https://accounts.example.com/auth");
  assert.equal(url.searchParams.get("client_id"), "client-id-1");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(
    url.searchParams.get("redirect_uri"),
    "http://127.0.0.1:3000/callback",
  );
  assert.equal(url.searchParams.get("scope"), "scope.a scope.b");
  assert.equal(url.searchParams.get("state"), "state1");
  assert.equal(url.searchParams.get("code_challenge"), "challenge");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("prompt"), "consent");
});

test("exchange: code 交換して TokenSet を返す", async () => {
  let calledUrl = "";
  let calledBody = "";
  const client = new YouTubeOAuthClient(new StubConfigProvider(), {
    fetchFn: async (input, init) => {
      calledUrl = String(input);
      calledBody = String(init?.body);
      return new Response(
        JSON.stringify({
          access_token: "access-1",
          refresh_token: "refresh-1",
          expires_in: 3600,
          scope: "scope.a scope.b",
          token_type: "Bearer",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });

  const tokenSet = await client.exchange({
    code: "code-1",
    codeVerifier: "verifier-1",
    redirectUri: "http://127.0.0.1:3000/callback",
  });

  assert.equal(calledUrl, "https://accounts.example.com/token");
  assert.match(calledBody, /grant_type=authorization_code/);
  assert.match(calledBody, /client_id=client-id-1/);
  assert.match(calledBody, /code=code-1/);
  assert.match(calledBody, /code_verifier=verifier-1/);
  assert.equal(tokenSet.accessToken, "access-1");
  assert.equal(tokenSet.refreshToken, "refresh-1");
  assert.equal(tokenSet.scope, "scope.a scope.b");
});

test("refresh: response に refresh_token が無ければ入力値を引き継ぐ", async () => {
  const client = new YouTubeOAuthClient(new StubConfigProvider(), {
    fetchFn: async () =>
      new Response(
        JSON.stringify({
          access_token: "access-2",
          expires_in: 1200,
          scope: "scope.a",
          token_type: "Bearer",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  });

  const tokenSet = await client.refresh({ refreshToken: "refresh-original" });
  assert.equal(tokenSet.refreshToken, "refresh-original");
  assert.equal(tokenSet.accessToken, "access-2");
});

test("token endpoint がエラーJSONを返したら YouTubeOAuthClientError", async () => {
  const client = new YouTubeOAuthClient(new StubConfigProvider(), {
    fetchFn: async () =>
      new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Token expired",
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      ),
  });

  await assert.rejects(
    client.refresh({ refreshToken: "refresh" }),
    (err: unknown) =>
      err instanceof Error &&
      err.name === "YouTubeOAuthClientError" &&
      err.message.includes("invalid_grant"),
  );
});

test("token endpoint が不正shapeを返したら YouTubeOAuthClientError", async () => {
  const client = new YouTubeOAuthClient(new StubConfigProvider(), {
    fetchFn: async () =>
      new Response(JSON.stringify({ token_type: "Bearer" }), { status: 200 }),
  });

  await assert.rejects(
    client.exchange({
      code: "code",
      codeVerifier: "verifier",
      redirectUri: "http://127.0.0.1:3000/callback",
    }),
    (err: unknown) =>
      err instanceof Error &&
      err.name === "YouTubeOAuthClientError" &&
      err.message.includes("unexpected shape"),
  );
});
