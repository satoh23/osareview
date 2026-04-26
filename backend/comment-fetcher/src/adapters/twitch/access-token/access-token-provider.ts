import { injectable } from "tsyringe";
import type { AccessTokenProvider } from "../../../infrastructure/shared/auth/access-token-provider.js";

@injectable()
export class TwitchAccessTokenProvider implements AccessTokenProvider {
  async getAccessToken(): Promise<string> {
    return process.env.TWITCH_ACCESS_TOKEN ?? "";
  }
}
