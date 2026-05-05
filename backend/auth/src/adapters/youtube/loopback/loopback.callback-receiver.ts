import {
  createLoopbackOAuthCallbackServer,
  LoopbackOAuthError,
} from "./loopback.server.js";
import type {
  OAuthCallbackReceiver,
  OAuthCallbackSession,
  StartOAuthCallbackSessionInput,
} from "../../../usecases/interfaces/oauth-callback-receiver.interface.js";

// NOTE: LoopbackCallbackSession が保持する `server` の型として使うために定義。
// `redirectUri` / `authorizationCode` / `close` の shape を手書きで重複させないため、
// createLoopbackOAuthCallbackServer の戻り型から導出している。
type LoopbackOAuthCallbackServer = Awaited<
  ReturnType<typeof createLoopbackOAuthCallbackServer>
>;

class LoopbackCallbackSession implements OAuthCallbackSession {
  constructor(private readonly server: LoopbackOAuthCallbackServer) {}

  get redirectUri(): string {
    return this.server.redirectUri;
  }

  async waitForAuthorizationCode(): Promise<string> {
    try {
      return await this.server.authorizationCode;
    } catch (err) {
      if (err instanceof LoopbackOAuthError) {
        throw new Error("OAuth callback failed.", { cause: err });
      }
      throw err;
    }
  }

  async close(): Promise<void> {
    await this.server.close();
  }
}

export class YouTubeOAuthCallbackReceiver implements OAuthCallbackReceiver {
  async start(
    input: StartOAuthCallbackSessionInput,
  ): Promise<OAuthCallbackSession> {
    const server = await createLoopbackOAuthCallbackServer({
      expectedState: input.expectedState,
      timeoutMs: input.timeoutMs,
    });
    return new LoopbackCallbackSession(server);
  }
}
