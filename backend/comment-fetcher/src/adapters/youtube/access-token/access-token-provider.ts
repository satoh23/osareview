import { injectable } from "tsyringe";
import type { AccessTokenProvider } from "../../../infrastructure/auth/access-token-provider.js";

@injectable()
export class YouTubeAccessTokenProvider implements AccessTokenProvider {
  async getAccessToken(): Promise<string> {
    return process.env.YOUTUBE_ACCESS_TOKEN ?? "";
  }
}
