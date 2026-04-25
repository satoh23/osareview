import type { Comment } from "../../entities/comment/comment.js";

export type FetchCommentsInput = {
  liveChatId: string;
  pageToken?: string;
};

export type FetchCommentsResult = {
  comments: Comment[];
  nextPageToken?: string;
  pollingIntervalMillis?: number;
};

export interface CommentRepository {
  fetchComments(input: FetchCommentsInput): Promise<FetchCommentsResult>;
}
