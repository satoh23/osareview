import { describe, expect, it } from "vitest";
import { ACCOUNT_LINK_STATES, SESSION_PLATFORMS } from "@comment-dock/shared";
import {
  ACCOUNT_LINK_ACTION_TYPES,
  accountLinkReducer,
  createInitialAccountLinkStore,
  selectAccountLinkStatus,
} from "./account-link-reducer";

describe("accountLinkReducer", () => {
  it("初期状態は provider ごとに unlinked を保持する", () => {
    const state = createInitialAccountLinkStore();

    expect(state.accounts).toEqual({
      youtube: {
        provider: SESSION_PLATFORMS.YOUTUBE,
        state: ACCOUNT_LINK_STATES.UNLINKED,
      },
      twitch: {
        provider: SESSION_PLATFORMS.TWITCH,
        state: ACCOUNT_LINK_STATES.UNLINKED,
      },
    });
    expect(state.isInitialSynced).toBe(false);
  });

  it("initialSyncSucceeded で Gateway から取得した状態に置き換える", () => {
    const state = accountLinkReducer(createInitialAccountLinkStore(), {
      type: ACCOUNT_LINK_ACTION_TYPES.INITIAL_SYNC_SUCCEEDED,
      accounts: {
        youtube: {
          provider: SESSION_PLATFORMS.YOUTUBE,
          state: ACCOUNT_LINK_STATES.LINKED,
        },
        twitch: {
          provider: SESSION_PLATFORMS.TWITCH,
          state: ACCOUNT_LINK_STATES.UNLINKED,
        },
      },
    });

    expect(state.isInitialSynced).toBe(true);
    expect(state.isInitialSyncing).toBe(false);
    expect(state.accounts.youtube.state).toBe(ACCOUNT_LINK_STATES.LINKED);
  });

  it("requestStarted と upsertAccountState で対象 provider の処理中状態を戻す", () => {
    const requesting = accountLinkReducer(createInitialAccountLinkStore(), {
      type: ACCOUNT_LINK_ACTION_TYPES.REQUEST_STARTED,
      provider: SESSION_PLATFORMS.YOUTUBE,
    });

    expect(
      selectAccountLinkStatus(requesting, SESSION_PLATFORMS.YOUTUBE)
        .isRequesting,
    ).toBe(true);

    const updated = accountLinkReducer(requesting, {
      type: ACCOUNT_LINK_ACTION_TYPES.UPSERT_ACCOUNT_STATE,
      account: {
        provider: SESSION_PLATFORMS.YOUTUBE,
        state: ACCOUNT_LINK_STATES.LINKING,
      },
    });

    expect(selectAccountLinkStatus(updated, SESSION_PLATFORMS.YOUTUBE)).toEqual(
      {
        snapshot: {
          provider: SESSION_PLATFORMS.YOUTUBE,
          state: ACCOUNT_LINK_STATES.LINKING,
        },
        isRequesting: false,
        error: undefined,
      },
    );
  });

  it("requestFailed は対象 provider にエラーを保持する", () => {
    const state = accountLinkReducer(createInitialAccountLinkStore(), {
      type: ACCOUNT_LINK_ACTION_TYPES.REQUEST_FAILED,
      provider: SESSION_PLATFORMS.TWITCH,
      error: "network error",
    });

    expect(selectAccountLinkStatus(state, SESSION_PLATFORMS.TWITCH).error).toBe(
      "network error",
    );
    expect(state.requestInFlight.twitch).toBe(false);
  });
});
