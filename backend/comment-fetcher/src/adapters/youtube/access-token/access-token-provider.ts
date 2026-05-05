import { inject, injectable } from "tsyringe";
import { NotAuthorizedError, type AuthClient } from "@comment-dock/auth";
import type { AccessTokenProvider } from "../../../infrastructure/shared/auth/access-token-provider.js";
import { YOUTUBE_DI_TOKENS } from "./di-tokens.js";

@injectable()
export class YouTubeAccessTokenProvider implements AccessTokenProvider {
  constructor(
    @inject(YOUTUBE_DI_TOKENS.authClient)
    private readonly authClient: AuthClient,
  ) {}

  async getAccessToken(): Promise<string> {
    try {
      return await this.authClient.getValidAccessToken("youtube");
    } catch (error) {
      if (error instanceof NotAuthorizedError) {
        console.warn(
          "[comment-fetcher] YouTube is not authorized. Run auth login first.",
        );
        return "";
      }
      throw error;
    }
  }
}
