// features/comment-stream slice の Public API。
export { COMMENT_STREAM_BUFFER_SIZE } from "./config/buffer";
export {
  CommentStreamProvider,
  useClearCommentStream,
  useCommentStream,
} from "./model/comment-stream-context";
export {
  enrichComment,
  enrichComments,
  type CommentType,
  type EnrichedComment,
  type SupportType,
  type ViewerStatus,
} from "./model/comment-classifier";
export {
  publishComment,
  publishComments,
  subscribeCommentStream,
} from "./model/comment-stream-events";
export {
  getFilteredEnrichedComments,
  useEnrichedComments,
} from "./model/use-enriched-comments";
export { useNewCommentBadge } from "./model/use-new-comment-badge";
export type {
  CommentStreamEvent,
  CommentStreamEventListener,
} from "./model/comment-stream-events";
export type { CommentStreamStore } from "./model/comment-stream-reducer";
