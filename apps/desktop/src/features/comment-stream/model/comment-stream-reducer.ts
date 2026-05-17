import type { CommentViewDto } from "@comment-dock/shared";

export type CommentStreamStore = {
  comments: CommentViewDto[];
  bufferSize: number;
};

export const COMMENT_STREAM_ACTION_TYPES = {
  COMMENT_APPENDED: "commentAppended",
  COMMENTS_BATCH_APPENDED: "commentsBatchAppended",
  CLEARED: "cleared",
} as const;

export type CommentStreamAction =
  | {
      type: typeof COMMENT_STREAM_ACTION_TYPES.COMMENT_APPENDED;
      comment: CommentViewDto;
    }
  | {
      type: typeof COMMENT_STREAM_ACTION_TYPES.COMMENTS_BATCH_APPENDED;
      comments: CommentViewDto[];
    }
  | { type: typeof COMMENT_STREAM_ACTION_TYPES.CLEARED };

// テストしやすさのため、コメント保持上限を引数で受け取り、Context とは分離して状態遷移だけを扱う。
export const createInitialCommentStreamStore = (
  bufferSize: number,
): CommentStreamStore => ({
  comments: [],
  bufferSize,
});

export const commentStreamReducer = (
  state: CommentStreamStore,
  action: CommentStreamAction,
): CommentStreamStore => {
  switch (action.type) {
    case COMMENT_STREAM_ACTION_TYPES.COMMENT_APPENDED:
      return appendComments(state, [action.comment]);
    case COMMENT_STREAM_ACTION_TYPES.COMMENTS_BATCH_APPENDED:
      return appendComments(state, action.comments);
    case COMMENT_STREAM_ACTION_TYPES.CLEARED:
      return {
        ...state,
        comments: [],
      };
  }
};

const appendComments = (
  state: CommentStreamStore,
  incomingComments: CommentViewDto[],
): CommentStreamStore => {
  const existingIds = new Set(state.comments.map((comment) => comment.id));
  const uniqueIncomingComments = incomingComments.filter((comment) => {
    if (existingIds.has(comment.id)) {
      return false;
    }
    existingIds.add(comment.id);
    return true;
  });

  if (uniqueIncomingComments.length === 0) {
    return state;
  }

  return {
    ...state,
    comments: [...state.comments, ...uniqueIncomingComments].slice(
      -state.bufferSize,
    ),
  };
};
