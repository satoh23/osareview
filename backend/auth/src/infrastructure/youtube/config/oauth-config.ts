import { injectable } from "tsyringe";

const DEFAULT_AUTHORIZATION_ENDPOINT =
  "https://accounts.google.com/o/oauth2/v2/auth";
const DEFAULT_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const DEFAULT_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
] as const;

const ENV_CLIENT_ID = "YOUTUBE_OAUTH_CLIENT_ID";
const ENV_AUTHORIZATION_ENDPOINT = "YOUTUBE_OAUTH_AUTHORIZATION_ENDPOINT";
const ENV_TOKEN_ENDPOINT = "YOUTUBE_OAUTH_TOKEN_ENDPOINT";
const ENV_SCOPES = "YOUTUBE_OAUTH_SCOPES";

export interface YouTubeOAuthConfig {
  readonly clientId: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly scopes: readonly string[];
}

export interface YouTubeOAuthConfigProvider {
  getOAuthConfig(): YouTubeOAuthConfig;
}

function parseScopes(raw: string | undefined): readonly string[] {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_SCOPES;
  }
  const parts = raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length === 0) {
    return DEFAULT_SCOPES;
  }
  return parts;
}

@injectable()
export class EnvYouTubeOAuthConfigProvider implements YouTubeOAuthConfigProvider {
  getOAuthConfig(): YouTubeOAuthConfig {
    const clientId = process.env[ENV_CLIENT_ID]?.trim() ?? "";
    if (clientId === "") {
      throw new Error(
        `${ENV_CLIENT_ID} is required (set it in your environment or .env)`,
      );
    }
    const authorizationEndpoint =
      process.env[ENV_AUTHORIZATION_ENDPOINT]?.trim() ||
      DEFAULT_AUTHORIZATION_ENDPOINT;
    const tokenEndpoint =
      process.env[ENV_TOKEN_ENDPOINT]?.trim() || DEFAULT_TOKEN_ENDPOINT;
    return {
      clientId,
      authorizationEndpoint,
      tokenEndpoint,
      scopes: parseScopes(process.env[ENV_SCOPES]),
    };
  }
}
