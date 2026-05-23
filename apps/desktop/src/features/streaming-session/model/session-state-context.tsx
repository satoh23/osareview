import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type {
  SessionPlatform,
  StreamingSessionSnapshot,
} from "@comment-dock/shared";
import {
  createStreamingSessionClient,
  type StreamingSessionClient,
} from "../../../shared/api/control";
import {
  createInitialStreamingSessionStore,
  SESSION_STATE_ACTION_TYPES,
  selectStreamingSessionStatus,
  streamingSessionReducer,
  type StreamingSessionStatus,
  type StreamingSessionStore,
} from "./session-state-reducer";
import { subscribeSessionState } from "./session-state-events";

type SessionStateContextValue = {
  store: StreamingSessionStore;
  applySessionState: (session: StreamingSessionSnapshot) => void;
  startSession: (
    platform: SessionPlatform,
  ) => Promise<StreamingSessionSnapshot>;
  stopSession: (platform: SessionPlatform) => Promise<StreamingSessionSnapshot>;
};

type SessionStateProviderProps = {
  children: ReactNode;
  client?: StreamingSessionClient;
};

const SessionStateContext = createContext<SessionStateContextValue | null>(
  null,
);

export function SessionStateProvider({
  children,
  client = createStreamingSessionClient(),
}: SessionStateProviderProps) {
  const [store, dispatch] = useReducer(
    streamingSessionReducer,
    undefined,
    createInitialStreamingSessionStore,
  );

  const applySessionState = useCallback((session: StreamingSessionSnapshot) => {
    dispatch({ type: SESSION_STATE_ACTION_TYPES.SESSION_UPDATED, session });
  }, []);

  useEffect(() => {
    let isActive = true;
    dispatch({ type: SESSION_STATE_ACTION_TYPES.INITIAL_SYNC_STARTED });

    void client
      .getSessionStates()
      .then((sessions) => {
        if (!isActive) {
          return;
        }
        dispatch({
          type: SESSION_STATE_ACTION_TYPES.INITIAL_SYNC_SUCCEEDED,
          sessions,
        });
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }
        dispatch({
          type: SESSION_STATE_ACTION_TYPES.INITIAL_SYNC_FAILED,
          error: getErrorMessage(error),
        });
      });

    return () => {
      isActive = false;
    };
  }, [client]);

  useEffect(
    () => subscribeSessionState((session) => applySessionState(session)),
    [applySessionState],
  );

  const startSession = useCallback(
    async (platform: SessionPlatform): Promise<StreamingSessionSnapshot> => {
      dispatch({ type: SESSION_STATE_ACTION_TYPES.REQUEST_STARTED, platform });
      try {
        const session = await client.startSession(platform);
        applySessionState(session);
        return session;
      } catch (error) {
        dispatch({
          type: SESSION_STATE_ACTION_TYPES.REQUEST_FAILED,
          platform,
          error: getErrorMessage(error),
        });
        throw error;
      }
    },
    [applySessionState, client],
  );

  const stopSession = useCallback(
    async (platform: SessionPlatform): Promise<StreamingSessionSnapshot> => {
      dispatch({ type: SESSION_STATE_ACTION_TYPES.REQUEST_STARTED, platform });
      try {
        const session = await client.stopSession(platform);
        applySessionState(session);
        return session;
      } catch (error) {
        dispatch({
          type: SESSION_STATE_ACTION_TYPES.REQUEST_FAILED,
          platform,
          error: getErrorMessage(error),
        });
        throw error;
      }
    },
    [applySessionState, client],
  );

  const value = useMemo(
    () => ({
      store,
      applySessionState,
      startSession,
      stopSession,
    }),
    [applySessionState, startSession, stopSession, store],
  );

  return (
    <SessionStateContext.Provider value={value}>
      {children}
    </SessionStateContext.Provider>
  );
}

export function useSessionState(
  platform: SessionPlatform,
): StreamingSessionStatus {
  const { store } = useSessionStateContext();
  return selectStreamingSessionStatus(store, platform);
}

export function useSessionStates(): StreamingSessionStore {
  return useSessionStateContext().store;
}

export function useApplySessionState(): (
  session: StreamingSessionSnapshot,
) => void {
  return useSessionStateContext().applySessionState;
}

export function useStartSession(): (
  platform: SessionPlatform,
) => Promise<StreamingSessionSnapshot> {
  return useSessionStateContext().startSession;
}

export function useStopSession(): (
  platform: SessionPlatform,
) => Promise<StreamingSessionSnapshot> {
  return useSessionStateContext().stopSession;
}

const useSessionStateContext = (): SessionStateContextValue => {
  const context = useContext(SessionStateContext);
  if (!context) {
    throw new Error(
      "コメント接続機能の初期化が完了していません。アプリを再読み込みしてください。",
    );
  }
  return context;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
