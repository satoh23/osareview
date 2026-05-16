import { describe, expect, it } from "vitest";
import { SESSION_PLATFORMS, SESSION_STATES } from "@comment-dock/shared";
import {
  SESSION_STATE_ACTION_TYPES,
  createInitialStreamingSessionStore,
  selectStreamingSessionStatus,
  streamingSessionReducer,
} from "./session-state-reducer";

describe("streamingSessionReducer", () => {
  it("初期状態は platform ごとに idle を保持する", () => {
    const state = createInitialStreamingSessionStore();

    expect(state.sessions).toEqual({
      youtube: {
        platform: SESSION_PLATFORMS.YOUTUBE,
        state: SESSION_STATES.IDLE,
      },
      twitch: {
        platform: SESSION_PLATFORMS.TWITCH,
        state: SESSION_STATES.IDLE,
      },
    });
    expect(state.isInitialSynced).toBe(false);
  });

  it("initialSyncSucceeded で Gateway から取得した状態に置き換える", () => {
    const state = streamingSessionReducer(
      createInitialStreamingSessionStore(),
      {
        type: SESSION_STATE_ACTION_TYPES.INITIAL_SYNC_SUCCEEDED,
        sessions: {
          youtube: {
            platform: SESSION_PLATFORMS.YOUTUBE,
            state: SESSION_STATES.CONNECTED,
          },
          twitch: {
            platform: SESSION_PLATFORMS.TWITCH,
            state: SESSION_STATES.IDLE,
          },
        },
      },
    );

    expect(state.isInitialSynced).toBe(true);
    expect(state.isInitialSyncing).toBe(false);
    expect(state.sessions.youtube.state).toBe(SESSION_STATES.CONNECTED);
  });

  it("requestStarted と sessionUpdated で対象 platform の処理中状態を戻す", () => {
    const requesting = streamingSessionReducer(
      createInitialStreamingSessionStore(),
      {
        type: SESSION_STATE_ACTION_TYPES.REQUEST_STARTED,
        platform: SESSION_PLATFORMS.YOUTUBE,
      },
    );

    expect(
      selectStreamingSessionStatus(requesting, SESSION_PLATFORMS.YOUTUBE)
        .isRequesting,
    ).toBe(true);

    const updated = streamingSessionReducer(requesting, {
      type: SESSION_STATE_ACTION_TYPES.SESSION_UPDATED,
      session: {
        platform: SESSION_PLATFORMS.YOUTUBE,
        state: SESSION_STATES.CONNECTING,
      },
    });

    expect(
      selectStreamingSessionStatus(updated, SESSION_PLATFORMS.YOUTUBE),
    ).toEqual({
      snapshot: {
        platform: SESSION_PLATFORMS.YOUTUBE,
        state: SESSION_STATES.CONNECTING,
      },
      isRequesting: false,
      error: undefined,
    });
  });

  it("requestFailed は対象 platform にエラーを保持する", () => {
    const state = streamingSessionReducer(
      createInitialStreamingSessionStore(),
      {
        type: SESSION_STATE_ACTION_TYPES.REQUEST_FAILED,
        platform: SESSION_PLATFORMS.TWITCH,
        error: "network error",
      },
    );

    expect(
      selectStreamingSessionStatus(state, SESSION_PLATFORMS.TWITCH).error,
    ).toBe("network error");
    expect(state.requestInFlight.twitch).toBe(false);
  });
});
