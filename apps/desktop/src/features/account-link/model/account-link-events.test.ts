import { describe, expect, it, vi } from "vitest";
import { ACCOUNT_LINK_STATES, SESSION_PLATFORMS } from "@comment-dock/shared";
import {
  publishAccountLinkState,
  subscribeAccountLinkState,
} from "./account-link-events";

describe("account-link-events", () => {
  it("subscribe した listener に account.state を配送する", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAccountLinkState(listener);

    publishAccountLinkState({
      provider: SESSION_PLATFORMS.YOUTUBE,
      state: ACCOUNT_LINK_STATES.LINKED,
    });

    expect(listener).toHaveBeenCalledWith({
      provider: SESSION_PLATFORMS.YOUTUBE,
      state: ACCOUNT_LINK_STATES.LINKED,
    });

    unsubscribe();
  });

  it("unsubscribe 後は listener を呼ばない", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAccountLinkState(listener);
    unsubscribe();

    publishAccountLinkState({
      provider: SESSION_PLATFORMS.TWITCH,
      state: ACCOUNT_LINK_STATES.UNLINKED,
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
