import { inject, injectable } from "tsyringe";
import { NotAuthorizedError, type AuthClient } from "@comment-dock/auth";
import type {
  AccessTokenProvider,
  AuthorizedHttpClient,
  AuthorizedHttpRequest,
} from "../../../infrastructure/shared/auth/access-token-provider.js";
import { SHARED_AUTH_DI_TOKENS } from "../../../infrastructure/shared/auth/di-tokens.js";

@injectable()
export class TwitchAccessTokenProvider
  implements AccessTokenProvider, AuthorizedHttpClient
{
  constructor(
    @inject(SHARED_AUTH_DI_TOKENS.authClient)
    private readonly authClient: AuthClient,
  ) {}

  async getAccessToken(): Promise<string> {
    try {
      return await this.authClient.getValidAccessToken("twitch");
    } catch (error) {
      if (error instanceof NotAuthorizedError) {
        console.warn(
          "[comment-fetcher] Twitch is not authorized. Run auth login first.",
        );
        return "";
      }
      throw error;
    }
  }

  request<T>(request: AuthorizedHttpRequest<T>): Promise<T> {
    return this.authClient.withAuthorizedRequest("twitch", request);
  }
}
