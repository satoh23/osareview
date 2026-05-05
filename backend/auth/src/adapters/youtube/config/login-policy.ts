import type { Provider } from "../../../provider.js";
import type { LoginPolicy } from "../../../usecases/interfaces/login-policy.interface.js";
import type { YouTubeOAuthConfigProvider } from "../../../infrastructure/youtube/config/oauth-config.js";

const DEFAULT_CALLBACK_TIMEOUT_MS = 180_000;

export class YouTubeLoginPolicy implements LoginPolicy {
  constructor(
    private readonly configProvider: YouTubeOAuthConfigProvider,
    private readonly callbackTimeoutMs: number = DEFAULT_CALLBACK_TIMEOUT_MS,
  ) {}

  getScopes(provider: Provider): readonly string[] {
    if (provider !== "youtube") {
      throw new Error(
        `Unsupported provider for YouTubeLoginPolicy: ${provider}`,
      );
    }
    return this.configProvider.getOAuthConfig().scopes;
  }

  getCallbackTimeoutMs(provider: Provider): number {
    if (provider !== "youtube") {
      throw new Error(
        `Unsupported provider for YouTubeLoginPolicy: ${provider}`,
      );
    }
    return this.callbackTimeoutMs;
  }
}
