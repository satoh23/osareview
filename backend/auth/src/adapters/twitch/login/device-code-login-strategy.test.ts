import test from "node:test";
import assert from "node:assert/strict";
import { TokenSet } from "../../../entities/token/token-set.js";
import { DeviceCodeLoginStrategy } from "./device-code-login-strategy.js";
import type {
  BrowserLauncher,
  DeviceAuthorization,
  DeviceCodeOAuthClient,
  LoginPolicy,
  PollingForTokenInput,
} from "../../../usecases/interfaces/index.js";

class FakeDeviceCodeOAuthClient implements DeviceCodeOAuthClient {
  requestScopes: readonly string[] | null = null;
  pollingInput: PollingForTokenInput | null = null;
  authorization: DeviceAuthorization = {
    deviceCode: "device-1",
    userCode: "ABCD-1234",
    verificationUri: new URL("https://www.twitch.tv/activate"),
    intervalSeconds: 5,
    expiresAtMs: 123_456_789,
  };
  loginResult = TokenSet.create({
    accessToken: "access-1",
    refreshToken: "refresh-1",
    expiresAt: 9_999_999_999,
    scope: "user:read:chat",
    obtainedAt: 1_000_000_000,
  });

  async requestDeviceAuthorization(
    scopes: readonly string[],
  ): Promise<DeviceAuthorization> {
    this.requestScopes = scopes;
    return this.authorization;
  }

  async pollingForToken(input: PollingForTokenInput): Promise<TokenSet> {
    this.pollingInput = input;
    return this.loginResult;
  }

  async refresh(): Promise<TokenSet> {
    throw new Error("not used");
  }
}

class FakeBrowserLauncher implements BrowserLauncher {
  openedUrl: URL | null = null;
  async open(url: URL): Promise<void> {
    this.openedUrl = url;
  }
}

class FixedLoginPolicy implements LoginPolicy {
  getScopes(): readonly string[] {
    return ["user:read:chat", "user:read:email"];
  }
  getCallbackTimeoutMs(): number {
    return 30_000;
  }
}

test("login: device authorization -> browser open -> polling を結線する", async () => {
  const oauthClient = new FakeDeviceCodeOAuthClient();
  const browserLauncher = new FakeBrowserLauncher();
  const strategy = new DeviceCodeLoginStrategy(
    oauthClient,
    browserLauncher,
    new FixedLoginPolicy(),
  );

  const tokenSet = await strategy.login();

  assert.deepEqual(oauthClient.requestScopes, [
    "user:read:chat",
    "user:read:email",
  ]);
  assert.equal(
    browserLauncher.openedUrl?.toString(),
    "https://www.twitch.tv/activate",
  );
  assert.deepEqual(oauthClient.pollingInput, {
    deviceCode: "device-1",
    intervalSeconds: 5,
    expiresAtMs: 123_456_789,
  });
  assert.equal(tokenSet.accessToken, "access-1");
});
