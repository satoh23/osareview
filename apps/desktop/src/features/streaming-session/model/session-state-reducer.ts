import {
  SESSION_PLATFORMS,
  SESSION_STATES,
  type SessionPlatform,
  type StreamingSessionSnapshot,
  type StreamingSessionSnapshots,
} from "@comment-dock/shared";

export type StreamingSessionStatus = {
  snapshot: StreamingSessionSnapshot;
  isRequesting: boolean;
  error?: string;
};

export type StreamingSessionStore = {
  sessions: StreamingSessionSnapshots;
  isInitialSynced: boolean;
  isInitialSyncing: boolean;
  requestInFlight: Record<SessionPlatform, boolean>;
  errors: Partial<Record<SessionPlatform, string>>;
  initialSyncError?: string;
};

export const SESSION_STATE_ACTION_TYPES = {
  INITIAL_SYNC_STARTED: "initialSyncStarted",
  INITIAL_SYNC_SUCCEEDED: "initialSyncSucceeded",
  INITIAL_SYNC_FAILED: "initialSyncFailed",
  SESSION_UPDATED: "sessionUpdated",
  REQUEST_STARTED: "requestStarted",
  REQUEST_FAILED: "requestFailed",
} as const;

export type StreamingSessionAction =
  | { type: typeof SESSION_STATE_ACTION_TYPES.INITIAL_SYNC_STARTED }
  | {
      type: typeof SESSION_STATE_ACTION_TYPES.INITIAL_SYNC_SUCCEEDED;
      sessions: StreamingSessionSnapshots;
    }
  | {
      type: typeof SESSION_STATE_ACTION_TYPES.INITIAL_SYNC_FAILED;
      error: string;
    }
  | {
      type: typeof SESSION_STATE_ACTION_TYPES.SESSION_UPDATED;
      session: StreamingSessionSnapshot;
    }
  | {
      type: typeof SESSION_STATE_ACTION_TYPES.REQUEST_STARTED;
      platform: SessionPlatform;
    }
  | {
      type: typeof SESSION_STATE_ACTION_TYPES.REQUEST_FAILED;
      platform: SessionPlatform;
      error: string;
    };

export const createInitialStreamingSessionStore =
  (): StreamingSessionStore => ({
    sessions: createIdleSessions(),
    isInitialSynced: false,
    isInitialSyncing: false,
    requestInFlight: {
      [SESSION_PLATFORMS.YOUTUBE]: false,
      [SESSION_PLATFORMS.TWITCH]: false,
    },
    errors: {},
  });

export const streamingSessionReducer = (
  state: StreamingSessionStore,
  action: StreamingSessionAction,
): StreamingSessionStore => {
  switch (action.type) {
    case SESSION_STATE_ACTION_TYPES.INITIAL_SYNC_STARTED:
      return {
        ...state,
        isInitialSyncing: true,
        initialSyncError: undefined,
      };
    case SESSION_STATE_ACTION_TYPES.INITIAL_SYNC_SUCCEEDED:
      return {
        ...state,
        sessions: action.sessions,
        isInitialSynced: true,
        isInitialSyncing: false,
        initialSyncError: undefined,
      };
    case SESSION_STATE_ACTION_TYPES.INITIAL_SYNC_FAILED:
      return {
        ...state,
        isInitialSyncing: false,
        initialSyncError: action.error,
      };
    case SESSION_STATE_ACTION_TYPES.SESSION_UPDATED:
      return applySessionSnapshot(state, action.session);
    case SESSION_STATE_ACTION_TYPES.REQUEST_STARTED:
      return {
        ...state,
        requestInFlight: {
          ...state.requestInFlight,
          [action.platform]: true,
        },
        errors: omitPlatform(state.errors, action.platform),
      };
    case SESSION_STATE_ACTION_TYPES.REQUEST_FAILED:
      return {
        ...state,
        requestInFlight: {
          ...state.requestInFlight,
          [action.platform]: false,
        },
        errors: {
          ...state.errors,
          [action.platform]: action.error,
        },
      };
  }
};

export const selectStreamingSessionStatus = (
  state: StreamingSessionStore,
  platform: SessionPlatform,
): StreamingSessionStatus => ({
  snapshot: state.sessions[platform],
  isRequesting: state.requestInFlight[platform],
  error: state.errors[platform],
});

const createIdleSessions = (): StreamingSessionSnapshots => ({
  [SESSION_PLATFORMS.YOUTUBE]: {
    platform: SESSION_PLATFORMS.YOUTUBE,
    state: SESSION_STATES.IDLE,
  },
  [SESSION_PLATFORMS.TWITCH]: {
    platform: SESSION_PLATFORMS.TWITCH,
    state: SESSION_STATES.IDLE,
  },
});

const applySessionSnapshot = (
  state: StreamingSessionStore,
  session: StreamingSessionSnapshot,
): StreamingSessionStore => ({
  ...state,
  sessions: {
    ...state.sessions,
    [session.platform]: session,
  },
  requestInFlight: {
    ...state.requestInFlight,
    [session.platform]: false,
  },
  errors: omitPlatform(state.errors, session.platform),
});

const omitPlatform = (
  errors: Partial<Record<SessionPlatform, string>>,
  platform: SessionPlatform,
): Partial<Record<SessionPlatform, string>> => {
  const next = { ...errors };
  delete next[platform];
  return next;
};
