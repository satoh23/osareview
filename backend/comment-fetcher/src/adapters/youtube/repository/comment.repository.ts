import type { YouTubeApiClient } from "../client/api.client.js";
import { inject, injectable } from "tsyringe";
import { mapYouTubeLiveChatMessagesToComments } from "../mapper/comment.mapper.js";
import { YOUTUBE_DI_TOKENS } from "../auth/di-tokens.js";
import type {
  CommentRepository,
  FetchCommentsInput,
  FetchCommentsResult,
} from "../../../usecases/youtube-comment-collection/comment-repository.interface.js";

interface YouTubeCommentApi {
  fetchLiveChatMessages: YouTubeApiClient["fetchLiveChatMessages"];
}

@injectable()
export class YouTubeCommentRepository implements CommentRepository {
  constructor(
    @inject(YOUTUBE_DI_TOKENS.apiClient)
    private readonly apiClient: YouTubeCommentApi,
  ) {}

  async fetchComments(input: FetchCommentsInput): Promise<FetchCommentsResult> {
    const response = await this.apiClient.fetchLiveChatMessages({
      liveChatId: input.liveChatId,
      pageToken: input.pageToken,
    });

    return {
      comments: mapYouTubeLiveChatMessagesToComments(response),
      nextPageToken: response.nextPageToken,
      pollingIntervalMillis: response.pollingIntervalMillis,
    };
  }
}
