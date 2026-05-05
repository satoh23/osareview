import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { EnvYouTubeOAuthConfigProvider } from "./oauth-config.js";

const ENV_CLIENT_ID = "YOUTUBE_OAUTH_CLIENT_ID";
const ENV_AUTHORIZATION_ENDPOINT = "YOUTUBE_OAUTH_AUTHORIZATION_ENDPOINT";
const ENV_TOKEN_ENDPOINT = "YOUTUBE_OAUTH_TOKEN_ENDPOINT";
const ENV_SCOPES = "YOUTUBE_OAUTH_SCOPES";

const withEnv = (
  vars: Record<string, string | undefined>,
  fn: () => void,
): void => {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(vars)) {
    previous[key] = process.env[key];
    const v = vars[key];
    if (v === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = v;
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(vars)) {
      const prev = previous[key];
      if (prev === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = prev;
      }
    }
  }
};

test("EnvYouTubeOAuthConfigProvider: client_id 必須（未設定なら例外）", () => {
  withEnv({ [ENV_CLIENT_ID]: undefined }, () => {
    const provider = new EnvYouTubeOAuthConfigProvider();
    assert.throws(
      () => provider.getOAuthConfig(),
      (err: unknown) =>
        err instanceof Error &&
        err.message.includes("YOUTUBE_OAUTH_CLIENT_ID is required"),
    );
  });
});

test("EnvYouTubeOAuthConfigProvider: 空文字の client_id は例外", () => {
  withEnv({ [ENV_CLIENT_ID]: "   " }, () => {
    const provider = new EnvYouTubeOAuthConfigProvider();
    assert.throws(() => provider.getOAuthConfig());
  });
});

test("EnvYouTubeOAuthConfigProvider: 既定の endpoints / scopes", () => {
  withEnv(
    {
      [ENV_CLIENT_ID]: "test-client-id",
      [ENV_AUTHORIZATION_ENDPOINT]: undefined,
      [ENV_TOKEN_ENDPOINT]: undefined,
      [ENV_SCOPES]: undefined,
    },
    () => {
      const provider = new EnvYouTubeOAuthConfigProvider();
      const config = provider.getOAuthConfig();
      assert.equal(config.clientId, "test-client-id");
      assert.equal(
        config.authorizationEndpoint,
        "https://accounts.google.com/o/oauth2/v2/auth",
      );
      assert.equal(config.tokenEndpoint, "https://oauth2.googleapis.com/token");
      assert.deepEqual(config.scopes, [
        "https://www.googleapis.com/auth/youtube.readonly",
      ]);
    },
  );
});

test("EnvYouTubeOAuthConfigProvider: 環境変数で endpoints / scopes を上書き", () => {
  withEnv(
    {
      [ENV_CLIENT_ID]: "id",
      [ENV_AUTHORIZATION_ENDPOINT]: "https://example.com/auth",
      [ENV_TOKEN_ENDPOINT]: "https://example.com/token",
      [ENV_SCOPES]: "a b  c",
    },
    () => {
      const provider = new EnvYouTubeOAuthConfigProvider();
      const config = provider.getOAuthConfig();
      assert.equal(config.authorizationEndpoint, "https://example.com/auth");
      assert.equal(config.tokenEndpoint, "https://example.com/token");
      assert.deepEqual(config.scopes, ["a", "b", "c"]);
    },
  );
});

test("EnvYouTubeOAuthConfigProvider: scopes はカンマ区切りも可", () => {
  withEnv(
    {
      [ENV_CLIENT_ID]: "id",
      [ENV_SCOPES]: "scope/one,scope/two",
    },
    () => {
      const provider = new EnvYouTubeOAuthConfigProvider();
      const config = provider.getOAuthConfig();
      assert.deepEqual(config.scopes, ["scope/one", "scope/two"]);
    },
  );
});
