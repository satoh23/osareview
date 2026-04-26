import { injectable } from "tsyringe";

const DEFAULT_YOUTUBE_DATA_API_BASE_URL =
  "https://www.googleapis.com/youtube/v3";

export interface YouTubeConfigProvider {
  getDataApiBaseUrl(): string;
}

@injectable()
export class EnvYouTubeConfigProvider implements YouTubeConfigProvider {
  getDataApiBaseUrl(): string {
    return (
      process.env.YOUTUBE_DATA_API_BASE_URL ?? DEFAULT_YOUTUBE_DATA_API_BASE_URL
    );
  }
}
