import test from "node:test";
import assert from "node:assert/strict";
import { TwitchLoginPolicy } from "./login-policy.js";

class StubTwitchOAuthConfigProvider {
  getOAuthConfig() {
    return {
      clientId: "twitch-client-id",
      deviceAuthorizationEndpoint: "https://id.example.com/device",
      tokenEndpoint: "https://id.example.com/token",
      scopes: ["user:read:chat", "user:read:email"],
    } as const;
  }
}

test("TwitchLoginPolicy: scopes は configProvider から返す", () => {
  const policy = new TwitchLoginPolicy(new StubTwitchOAuthConfigProvider());
  assert.deepEqual(policy.getScopes(), ["user:read:chat", "user:read:email"]);
});

test("TwitchLoginPolicy: timeout 既定値は 30 分", () => {
  const policy = new TwitchLoginPolicy(new StubTwitchOAuthConfigProvider());
  assert.equal(policy.getCallbackTimeoutMs(), 1_800_000);
});

test("TwitchLoginPolicy: timeout はコンストラクタで上書き可能", () => {
  const policy = new TwitchLoginPolicy(
    new StubTwitchOAuthConfigProvider(),
    45_000,
  );
  assert.equal(policy.getCallbackTimeoutMs(), 45_000);
});
