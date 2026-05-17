import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { CommentViewDto } from "@comment-dock/shared";
import { COMMENT_STREAM_ERROR_MESSAGES } from "../../../shared/const";
import {
  COMMENT_STREAM_EVENT_TYPES,
  subscribeCommentStream,
} from "./comment-stream-events";
import {
  COMMENT_STREAM_ACTION_TYPES,
  commentStreamReducer,
  createInitialCommentStreamStore,
} from "./comment-stream-reducer";

const DEFAULT_COMMENT_STREAM_BUFFER_SIZE = 500;

type CommentStreamContextValue = {
  comments: CommentViewDto[];
  clearCommentStream: () => void;
};

type CommentStreamProviderProps = {
  children: ReactNode;
  bufferSize?: number;
};

const CommentStreamContext = createContext<CommentStreamContextValue | null>(
  null,
);

export function CommentStreamProvider({
  children,
  bufferSize = DEFAULT_COMMENT_STREAM_BUFFER_SIZE,
}: CommentStreamProviderProps) {
  const [store, dispatch] = useReducer(
    commentStreamReducer,
    bufferSize,
    createInitialCommentStreamStore,
  );

  const clearCommentStream = useCallback(() => {
    dispatch({ type: COMMENT_STREAM_ACTION_TYPES.CLEARED });
  }, []);

  useEffect(
    () =>
      subscribeCommentStream((event) => {
        if (event.type === COMMENT_STREAM_EVENT_TYPES.COMMENT_PUBLISHED) {
          dispatch({
            type: COMMENT_STREAM_ACTION_TYPES.COMMENT_APPENDED,
            comment: event.comment,
          });
          return;
        }

        dispatch({
          type: COMMENT_STREAM_ACTION_TYPES.COMMENTS_BATCH_APPENDED,
          comments: event.comments,
        });
      }),
    [],
  );

  const value = useMemo(
    () => ({
      comments: store.comments,
      clearCommentStream,
    }),
    [clearCommentStream, store.comments],
  );

  return (
    <CommentStreamContext.Provider value={value}>
      {children}
    </CommentStreamContext.Provider>
  );
}

export function useCommentStream(): CommentViewDto[] {
  return useCommentStreamContext().comments;
}

export function useClearCommentStream(): () => void {
  return useCommentStreamContext().clearCommentStream;
}

const useCommentStreamContext = (): CommentStreamContextValue => {
  const context = useContext(CommentStreamContext);
  if (!context) {
    throw new Error(
      COMMENT_STREAM_ERROR_MESSAGES.HOOKS_OUTSIDE_COMMENT_STREAM_PROVIDER,
    );
  }
  return context;
};
