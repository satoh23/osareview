import type { CommentViewDto } from "../comment/comment-view.dto.js";

export type SessionPlatform = "youtube" | "twitch";

export type SessionState = "idle" | "connecting" | "connected" | "failed";

export const SESSION_PLATFORMS = {
  YOUTUBE: "youtube",
  TWITCH: "twitch",
} as const satisfies Record<string, SessionPlatform>;

export const SESSION_STATES = {
  IDLE: "idle",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  FAILED: "failed",
} as const satisfies Record<string, SessionState>;

export const COMMENT_DELIVERY_MESSAGE_TYPES = {
  COMMENTS_APPEND: "comments.append",
  COMMENTS_BATCH: "comments.batch",
  SESSION_STATE: "session.state",
} as const;

export const SESSION_STATE_MESSAGE_TYPE =
  COMMENT_DELIVERY_MESSAGE_TYPES.SESSION_STATE;

export type CommentDeliveryMessageType =
  (typeof COMMENT_DELIVERY_MESSAGE_TYPES)[keyof typeof COMMENT_DELIVERY_MESSAGE_TYPES];

export type CommentsAppendMessage = {
  type: typeof COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_APPEND;
  payload: {
    comment: CommentViewDto;
  };
};

export type CommentsBatchMessage = {
  type: typeof COMMENT_DELIVERY_MESSAGE_TYPES.COMMENTS_BATCH;
  payload: {
    comments: CommentViewDto[];
  };
};

export type SessionStateMessage = {
  type: typeof COMMENT_DELIVERY_MESSAGE_TYPES.SESSION_STATE;
  payload: {
    platform: SessionPlatform;
    state: SessionState;
    reason?: string;
  };
};

export type StreamingSessionSnapshot = {
  platform: SessionPlatform;
  state: SessionState;
  reason?: string;
};

export type StreamingSessionSnapshots = Record<
  SessionPlatform,
  StreamingSessionSnapshot
>;

export type StreamingSessionResponse = {
  session: StreamingSessionSnapshot;
};

export type StreamingSessionsResponse = {
  sessions: StreamingSessionSnapshots;
};

export type CommentDeliveryMessage =
  | CommentsAppendMessage
  | CommentsBatchMessage
  | SessionStateMessage;
