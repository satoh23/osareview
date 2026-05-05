import "reflect-metadata";
import test from "node:test";
import assert from "node:assert/strict";
import { EnvTwitchOAuthConfigProvider } from "./oauth-config.js";

const ENV_CLIENT_ID = "TWITCH_CLIENT_ID";
const ENV_DEVICE_AUTHORIZATION_ENDPOINT =
  "TWITCH_OAUTH_DEVICE_AUTHORIZATION_ENDPOINT";
const ENV_TOKEN_ENDPOINT = "TWITCH_OAUTH_TOKEN_ENDPOINT";
const ENV_SCOPES = "TWITCH_OAUTH_SCOPES";

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

test("EnvTwitchOAuthConfigProvider: client_id 必須（未設定なら例外）", () => {
  withEnv({ [ENV_CLIENT_ID]: undefined }, () => {
    const provider = new EnvTwitchOAuthConfigProvider();
    assert.throws(
      () => provider.getOAuthConfig(),
      (err: unknown) =>
        err instanceof Error &&
        err.message.includes("TWITCH_CLIENT_ID is required"),
    );
  });
});

test("EnvTwitchOAuthConfigProvider: 空文字の client_id は例外", () => {
  withEnv({ [ENV_CLIENT_ID]: "   " }, () => {
    const provider = new EnvTwitchOAuthConfigProvider();
    assert.throws(() => provider.getOAuthConfig());
  });
});

test("EnvTwitchOAuthConfigProvider: 既定の endpoints / scopes", () => {
  withEnv(
    {
      [ENV_CLIENT_ID]: "twitch-client-id",
      [ENV_DEVICE_AUTHORIZATION_ENDPOINT]: undefined,
      [ENV_TOKEN_ENDPOINT]: undefined,
      [ENV_SCOPES]: undefined,
    },
    () => {
      const provider = new EnvTwitchOAuthConfigProvider();
      const config = provider.getOAuthConfig();
      assert.equal(config.clientId, "twitch-client-id");
      assert.equal(
        config.deviceAuthorizationEndpoint,
        "https://id.twitch.tv/oauth2/device",
      );
      assert.equal(config.tokenEndpoint, "https://id.twitch.tv/oauth2/token");
      assert.deepEqual(config.scopes, ["user:read:chat"]);
    },
  );
});

test("EnvTwitchOAuthConfigProvider: 環境変数で endpoints / scopes を上書き", () => {
  withEnv(
    {
      [ENV_CLIENT_ID]: "id",
      [ENV_DEVICE_AUTHORIZATION_ENDPOINT]: "https://example.com/device",
      [ENV_TOKEN_ENDPOINT]: "https://example.com/token",
      [ENV_SCOPES]: "user:read:chat user:read:email",
    },
    () => {
      const provider = new EnvTwitchOAuthConfigProvider();
      const config = provider.getOAuthConfig();
      assert.equal(
        config.deviceAuthorizationEndpoint,
        "https://example.com/device",
      );
      assert.equal(config.tokenEndpoint, "https://example.com/token");
      assert.deepEqual(config.scopes, ["user:read:chat", "user:read:email"]);
    },
  );
});

test("EnvTwitchOAuthConfigProvider: scopes はカンマ区切りも可", () => {
  withEnv(
    {
      [ENV_CLIENT_ID]: "id",
      [ENV_SCOPES]: "scope/one,scope/two",
    },
    () => {
      const provider = new EnvTwitchOAuthConfigProvider();
      const config = provider.getOAuthConfig();
      assert.deepEqual(config.scopes, ["scope/one", "scope/two"]);
    },
  );
});
